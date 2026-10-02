import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma.service.js';
import { SystemeComptable } from '@prisma/client';

/** Rôles réellement acceptés par l'enum PostgreSQL `role_utilisateur`. */
const ROLES = ['admin_compte', 'utilisateur_standard', 'assistant_ia_systeme', 'integration_externe'] as const;
type Role = (typeof ROLES)[number];

/** Valeurs de l'enum `systeme_comptable`, alignées sur PostgreSQL. */
const SYSTEMES_COMPTABLES = ['SYSCOHADA', 'PCG', 'IFRS', 'AUTRE'] as const;

@Injectable()
export class UtilisateursService {
  private readonly logger = new Logger(UtilisateursService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Comptes de l'organisation. On lit `user_tenants` (rattachement
   * multi-organisation) en priorité, et `users` en complément pour les
   * comptes qui n'ont qu'une organisation principale.
   */
  async lister(tenantId: string) {
    const [rattachements, proprietaires] = await Promise.all([
      this.prisma.userTenant.findMany({
        where: { tenant_id: tenantId },
        include: { user: true },
        orderBy: { role: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { tenant_id: tenantId, deleted_at: null },
        include: { user_tenants: true },
        orderBy: { created_at: 'asc' },
      }),
    ]);

    const vus = new Set<string>();
    const comptes = [
      ...rattachements
        .filter((r) => r.user && !vus.has(r.user_id))
        .map((r) => {
          vus.add(r.user_id);
          return this.versCompte(r.user_id, r.user!.email, r.user!.nom, r.role, true, r.user!.created_at);
        }),
      ...proprietaires
        .filter((u) => !vus.has(u.id))
        .map((u) => this.versCompte(u.id, u.email, u.nom, u.role, false, u.created_at)),
    ];

    return comptes;
  }

  /**
   * Organizations accessible to a single account.
   *
   * Un compte n'est pas lié à une seule entreprise : `users.tenant_id` porte
   * son organisation principale, `user_tenants` ses organisations
   * supplémentaires. C'est cette liste que l'interface doit proposer pour
   * laisser l'utilisateur basculer d'une entreprise à l'autre sans changer
   * d'identité.
   *
   * On résout le compte par `keycloak_subject_id` en priorité : c'est
   * l'identifiant que porte le jeton, et non l'UUID interne.
   */
  async mesOrganisations(subject: string) {
    const compte = await this.prisma.user.findFirst({
      where: {
        deleted_at: null,
        OR: [{ keycloak_subject_id: subject }, { id: subject }],
      },
      select: { id: true },
    });
    if (!compte) return [];

    const [rattachements, principal] = await Promise.all([
      this.prisma.userTenant.findMany({ where: { user_id: compte.id }, select: { tenant_id: true, role: true } }),
      this.prisma.user.findUnique({
        where: { id: compte.id },
        select: { tenant_id: true, role: true },
      }),
    ]);

    const roles = new Map<string, string>();
    for (const r of rattachements) roles.set(r.tenant_id, r.role);
    if (principal && !roles.has(principal.tenant_id)) roles.set(principal.tenant_id, principal.role);

    const ids = [...roles.keys()];
    if (!ids.length) return [];

    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: ids } },
      select: { id: true, raison_sociale: true, secteur: true, pays: true, ville: true, devise: true, statut_abonnement: true },
      orderBy: { raison_sociale: 'asc' },
    });

    return tenants.map((t) => ({
      id: t.id,
      raison_sociale: t.raison_sociale,
      secteur: t.secteur,
      pays: t.pays,
      ville: t.ville,
      devise: t.devise,
      plan: t.statut_abonnement,
      role: roles.get(t.id),
      principale: principal?.tenant_id === t.id,
    }));
  }

  /**
   * Crée une entreprise et y rattache le compte connecté.
   *
   * C'est le maillon qui manquait au démarrage : l'onboarding et toutes les
   * pages métier exigent un tenant, donc un compte qui n'a pas encore
   * d'entreprise ne pouvait rien faire — il restait bloqué sur un 403 avant
   * même d'atteindre l'écran d'accueil.
   *
   * Un compte existant n'est jamais écrasé : son organisation principale reste
   * la sienne, la nouvelle entreprise s'ajoute comme rattachement. C'est ce
   * qui permet à une même identité de piloter plusieurs entreprises.
   */
  async creerOrganisation(
    subject: string,
    data: any,
    profil?: { email?: string | null; nom?: string | null },
  ) {
    if (!subject) throw new BadRequestException('Session invalide.');

    const raison_sociale = String(data?.raison_sociale ?? '').trim();
    if (!raison_sociale) throw new BadRequestException("La raison sociale est obligatoire.");

    const deviseBrute = data?.devise ? String(data.devise).trim().toUpperCase() : null;
    if (deviseBrute && !/^[A-Z]{3}$/.test(deviseBrute)) {
      throw new BadRequestException('La devise doit être un code ISO à 3 lettres (XAF, EUR…).');
    }
    const systeme = data?.systeme_comptable ? String(data.systeme_comptable) : 'SYSCOHADA';
    if (!SYSTEMES_COMPTABLES.includes(systeme as SystemeComptable)) {
      throw new BadRequestException(`Système comptable invalide. Attendu : ${SYSTEMES_COMPTABLES.join(', ')}.`);
    }

    const nomCompte = String(data?.nom ?? '').trim();
    // Un compte qui vient de s'authentifier ne doit pas ressaisir son adresse
    // et son nom : Keycloak les a déjà validés, le jeton les porte.
    const email = (String(data?.email ?? '').trim() || String(profil?.email ?? '').trim()).toLowerCase();

    // L'identifiant reprend un slug lisible du nom, avec un suffixe en cas de
    // collision : un tenant stable et explicite vaut mieux qu'un UUID opaque.
    const base = this.slug(raison_sociale);
    let id = base;
    for (let i = 2; await this.prisma.tenant.findUnique({ where: { id } }); i++) id = `${base}-${i}`;

    const existant = await this.prisma.user.findFirst({
      where: { deleted_at: null, OR: [{ keycloak_subject_id: subject }, ...(email ? [{ email }] : [])] },
    });

    // L'entreprise, le compte et le rattachement forment un seul tout : sans
    // cela, un échec sur le compte laissait une entreprise orpheline en base,
    // visible dans l'API et impossible à rattacher ensuite.
    const nomFallback = nomCompte || String(profil?.nom ?? '').trim();
    if (!existant && !email) {
      throw new BadRequestException("L'adresse e-mail est requise pour créer un compte.");
    }

    const { tenant, compte } = await this.prisma.$transaction(async (tx) => {
      const tenantCree = await tx.tenant.create({
        data: {
          id,
          raison_sociale,
          secteur: data?.secteur ? String(data.secteur).trim() : null,
          pays: data?.pays ? String(data.pays).trim() : null,
          ville: data?.ville ? String(data.ville).trim() : null,
          devise: deviseBrute,
          systeme_comptable: systeme as SystemeComptable,
          parametres: { onboarding: { cree_le: new Date().toISOString() } } as any,
        },
      });

      let compteCree;
      if (existant) {
        compteCree = existant;
        // Le compte garde son organisation principale ; la nouvelle entreprise
        // entre comme rattachement supplémentaire.
        await tx.userTenant.upsert({
          where: { user_id_tenant_id: { user_id: existant.id, tenant_id: tenantCree.id } },
          create: { user_id: existant.id, tenant_id: tenantCree.id, role: 'admin_compte' },
          update: { role: 'admin_compte' },
        });
      } else {
        const nomFinal = nomFallback || email;
        compteCree = await tx.user.create({
          data: {
            tenant_id: tenantCree.id,
            nom: nomFinal,
            email,
            role: 'admin_compte',
            keycloak_subject_id: subject,
          },
        });
        await tx.userTenant.create({
          data: { user_id: compteCree.id, tenant_id: tenantCree.id, role: 'admin_compte' },
        });
      }
      return { tenant: tenantCree, compte: compteCree };
    });

    return {
      organisation: { id: tenant.id, raison_sociale: tenant.raison_sociale, devise: tenant.devise, pays: tenant.pays },
      compte: { id: compte.id, email: compte.email, nom: compte.nom, role: 'admin_compte' },
      cree: true,
    };
  }

  /** Slug ASCII simple, dérivé de la raison sociale. */
  private slug(valeur: string): string {
    const s = valeur
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    return s || 'entreprise';
  }

  /**
   * Inscription autonome : crée l'identité Keycloak, l'entreprise et le
   * rattachement, en une seule opération.
   *
   * Le client `elara-web` étant confidentiel, le formulaire d'inscription de
   * Keycloak ne peut pas le prendre en charge : l'inscription passe donc par
   * l'API, qui détient déjà les droits d'administration.
   *
   * Rien de ce que fournit l'appelant n'est repris tel quel côté sécurité :
   * ni le rôle, ni l'identifiant Keycloak, ni l'identifiant d'entreprise. Le
   * mot de passe choisi est le seul élément qu'on accepte de l'extérieur,
   * puisqu'il doit correspondre à ce que l'utilisateur saisira ensuite.
   */
  async inscrire(data: any) {
    const email = String(data?.email ?? '').trim().toLowerCase();
    const motDePasse = String(data?.mot_de_passe ?? '');
    // Le profil Keycloak exige un prénom ET un nom : l'un des deux seul produit
    // un compte qui ne peut pas se connecter.
    const nom = String(data?.nom ?? '').trim();
    const raison_sociale = String(data?.raison_sociale ?? '').trim();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new BadRequestException("Adresse e-mail invalide.");
    }
    if (motDePasse.length < 10) {
      throw new BadRequestException('Le mot de passe doit contenir au moins 10 caractères.');
    }
    if (!nom) throw new BadRequestException('Le nom du responsable est obligatoire.');
    if (!raison_sociale) throw new BadRequestException("La raison sociale est obligatoire.");
    if (!String(data?.prenom ?? '').trim()) {
      throw new BadRequestException('Le prénom du responsable est obligatoire.');
    }

    const deviseBrute = data?.devise ? String(data.devise).trim().toUpperCase() : 'XAF';
    if (!/^[A-Z]{3}$/.test(deviseBrute)) {
      throw new BadRequestException('La devise doit être un code ISO à 3 lettres (XAF, EUR…).');
    }
    const systeme = data?.systeme_comptable ? String(data.systeme_comptable) : 'SYSCOHADA';
    if (!SYSTEMES_COMPTABLES.includes(systeme as SystemeComptable)) {
      throw new BadRequestException(`Système comptable invalide. Attendu : ${SYSTEMES_COMPTABLES.join(', ')}.`);
    }

    const dejaLa = await this.prisma.user.findFirst({ where: { email, deleted_at: null } });
    if (dejaLa) throw new ConflictException('Un compte existe déjà pour cette adresse.');

    const base = this.slug(raison_sociale);
    let tenantId = base;
    for (let i = 2; await this.prisma.tenant.findUnique({ where: { id: tenantId } }); i++) tenantId = `${base}-${i}`;

    // 1. Identité Keycloak d'abord : sans elle, le compte resterait
    //    injoignable, car c'est le lien entre les deux qui conditionne tout
    //    l'accès ensuite.
    const baseKc = (process.env.KEYCLOAK_ADMIN_URL || process.env.KEYCLOAK_URL || '').replace(/\/$/, '');
    if (!baseKc) {
      throw new ServiceUnavailableException(
        "L'inscription est indisponible : Keycloak n'est pas configuré sur cette installation.",
      );
    }
    const realm = process.env.KEYCLOAK_REALM || 'Elara';
    const token = await this.jetonAdmin(baseKc);
    if (!token) {
      throw new ServiceUnavailableException(
        "L'inscription est indisponible : l'administration de Keycloak n'est pas autorisée.",
      );
    }

    let sujet: string | null = null;
    try {
      const reponse = await fetch(`${baseKc}/admin/realms/${realm}/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email,
          email,
          ...this.identite(String(data?.prenom ?? ''), nom),
          enabled: true,
          emailVerified: true,
          credentials: [{ type: 'password', value: motDePasse, temporary: false }],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (reponse.status === 409) {
        throw new ConflictException('Un compte existe déjà pour cette adresse.');
      }
      if (!reponse.ok) {
        throw new ServiceUnavailableException(`Keycloak a refusé l'inscription (HTTP ${reponse.status}).`);
      }
      sujet = String(reponse.headers.get('location') ?? '').split('/').pop() || (await this.sujetParEmail(baseKc, realm, email, token));
      if (!sujet) throw new ServiceUnavailableException("Identité Keycloak créée mais introuvable.");
    } catch (e) {
      if (e instanceof ConflictException) throw e;
      this.logger.warn(`Inscription Keycloak impossible pour ${email} : ${(e as any)?.message ?? e}`);
      throw new ServiceUnavailableException("L'inscription est indisponible pour le moment.");
    }

    // 2. Entreprise et rattachement, en une seule transaction : trois
    //    écritures successives peuvent s'interrompre au milieu et laisser une
    //    entreprise sans compte, ou l'inverse — deux états impossibles à
    //    rattraper depuis l'interface. En cas d'échec, l'identité Keycloak
    //    est en plus annulée : mieux vaut une inscription refusée qu'un
    //    compte sans entreprise, inaccessible et impossible à diagnostiquer.
    try {
      const resultat = await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            id: tenantId,
            raison_sociale,
            secteur: data?.secteur ? String(data.secteur).trim() : null,
            pays: data?.pays ? String(data.pays).trim() : null,
            ville: data?.ville ? String(data.ville).trim() : null,
            devise: deviseBrute,
            systeme_comptable: systeme as SystemeComptable,
            parametres: { onboarding: { cree_le: new Date().toISOString(), origine: 'inscription' } } as any,
          },
        });

        const compte = await tx.user.create({
          data: {
            tenant_id: tenant.id,
            nom,
            email,
            role: 'admin_compte',
            keycloak_subject_id: sujet,
          },
        });
        await tx.userTenant.create({
          data: { user_id: compte.id, tenant_id: tenant.id, role: 'admin_compte' },
        });

        return { tenant, compte };
      });

      return {
        entreprise: { id: resultat.tenant.id, raison_sociale: resultat.tenant.raison_sociale },
        compte: { id: resultat.compte.id, email: resultat.compte.email, nom: resultat.compte.nom },
        inscrit: true,
      };
    } catch (e) {
      await fetch(`${baseKc}/admin/realms/${realm}/users/${sujet}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
      this.logger.warn(`Inscription interrompue pour ${email}, identité Keycloak annulée : ${(e as any)?.message ?? e}`);
      throw new ServiceUnavailableException("L'inscription n'a pas pu aboutir. Réessayez.");
    }
  }

  /**
   * Vérifie que l'appelant administre l'organisation demandée.
   *
   * Sans cette vérification, n'importe quel membre authentifié pouvait inviter
   * un compte et lui attribuer `admin_compte` — c'est-à-dire s'octroyer
   * lui-même les pleins pouvoirs sur l'entreprise en appelant l'API
   * directement. Le rôle se lit dans `user_tenants`, qui est le rôle réel pour
   * une organisation donnée.
   */
  private async exigerAdmin(tenantId: string, subject: string) {
    if (!subject) throw new UnauthorizedException('Session invalide.');
    const membre = await this.prisma.userTenant.findFirst({
      where: {
        tenant_id: tenantId,
        user: { keycloak_subject_id: subject, deleted_at: null },
      },
      select: { role: true },
    });
    if (membre?.role !== 'admin_compte') {
      throw new ForbiddenException(
        'Seul un administrateur de cette organisation peut gérer ses comptes.',
      );
    }
  }

  async invitation(tenantId: string, data: any, auteurId?: string) {
    await this.exigerAdmin(tenantId, auteurId ?? '');

    const email = String(data?.email ?? '').trim().toLowerCase();
    const nom = String(data?.nom ?? '').trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new BadRequestException('Adresse e-mail invalide.');
    }
    if (!nom) throw new BadRequestException('Le nom est obligatoire.');
    const role = this.validerRole(data?.role);

    const existant = await this.prisma.user.findUnique({ where: { email } });
    let compte;
    let dejaExistant = false;
    if (existant) {
      // Un compte existant n'est pas dupliqué : on le rattache à l'organisation.
      dejaExistant = true;
      compte = existant;
      await this.prisma.userTenant.upsert({
        where: { user_id_tenant_id: { user_id: existant.id, tenant_id: tenantId } },
        create: { user_id: existant.id, tenant_id: tenantId, role },
        update: { role },
      });
    } else {
      compte = await this.prisma.user.create({
        data: { tenant_id: tenantId, nom, email, role, created_at: new Date() },
      });
      await this.prisma.userTenant.create({
        data: { user_id: compte.id, tenant_id: tenantId, role },
      });
    }

    // Le provisionnement précède l'invitation : c'est lui qui dit si
    // l'identité vient d'être créée — donc si un lien d'activation a un sens.
    // Pour un compte déjà actif, le rattachement à l'organisation suffit : lui
    // renvoyer un lien permettrait de réécrire son mot de passe.
    const identite = await this.provisionner(compte.id, email, nom);
    const premiereIdentite = identite.etat === 'provisionne' && identite.nouvelle_identite === true;
    const activation = premiereIdentite
      ? await this.creerInvitation(tenantId, compte.id, email, role, auteurId)
      : null;

    return {
      ...this.versCompte(compte.id, compte.email, compte.nom, role, true, compte.created_at),
      deja_existant: dejaExistant,
      invite_par: auteurId ?? null,
      identite,
      activation,
      note: premiereIdentite
        ? null
        : 'Ce compte possède déjà un mot de passe : il a été rattaché à cette organisation, mais aucun lien d’activation n’est nécessaire. La personne se connecte avec ses identifiants habituels.',
    };
  }

  /**
   * Émet un lien d'activation à usage unique.
   *
   * Le jeton brut part vers l'administrateur, seule son empreinte est conservée.
   * Une invitation antérieure encore valide est invalidée : un ancien lien
   * d'activation resterait sinon valable et deviendrait un accès permanent.
   */
  private async creerInvitation(
    tenantId: string,
    userId: string,
    email: string,
    role: Role,
    auteurId?: string,
  ) {
    await this.prisma.invitation.updateMany({
      where: { user_id: userId, tenant_id: tenantId, utilise_le: null },
      data: { utilise_le: new Date() },
    });

    const jeton = randomBytes(32).toString('base64url');
    const expire = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    await this.prisma.invitation.create({
      data: {
        tenant_id: tenantId,
        user_id: userId,
        email,
        role,
        jeton_hash: this.empreinte(jeton),
        expire_le: expire,
        invite_par: auteurId ?? null,
      },
    });

    const base = (process.env.PUBLIC_WEB_URL || 'http://localhost:3000').replace(/\/$/, '');
    return {
      lien: `${base}/activer?jeton=${jeton}`,
      expire_le: expire.toISOString(),
      duree_jours: 7,
    };
  }

  /** Empreinte SHA-256 du jeton : ce qui est stocké ne permet pas de s'authentifier. */
  private empreinte(jeton: string) {
    return createHash('sha256').update(jeton).digest('hex');
  }

  /** Retrouve une invitation valide à partir du jeton brut présenté par l'invité. */
  private async invitationValide(jeton: string) {
    if (!jeton || jeton.length < 20) throw new BadRequestException('Lien d’activation invalide.');
    const invitation = await this.prisma.invitation.findUnique({
      where: { jeton_hash: this.empreinte(jeton) },
      include: { tenant: { select: { raison_sociale: true } } },
    });
    if (!invitation) throw new NotFoundException('Ce lien d’activation n’existe pas ou a déjà été utilisé.');
    if (invitation.utilise_le) throw new BadRequestException('Ce lien d’activation a déjà été utilisé.');
    if (invitation.expire_le.getTime() < Date.now()) {
      throw new BadRequestException('Ce lien d’activation a expiré. Demandez-en un nouveau.');
    }
    return invitation;
  }

  /**
   * Activation : l'invité choisit son mot de passe.
   *
   * L'identité Keycloak est créée si elle manque, sinon son mot de passe est
   * remplacé. `temporary: false` est indispensable : Keycloak refusait ensuite
   * toute connexion en imposant une réinitialisation que le realm ne permet pas.
   *
   * Le remplacement n'est possible que sur une identité qui n'a jamais eu de
   * mot de passe. Sans cette vérification, un administrateur d'une organisation
   * pouvait inviter l'adresse d'un compte déjà actif — y compris celle d'un
   * administrateur global ou d'un membre d'une autre société — puis réécrire son
   * mot de passe avec le lien reçu : prise de contrôle du compte, et de tous ses
   * autres accès. C'est Keycloak qui fait foi, pas notre base.
   */
  async activer(jeton: string, motDePasse: string) {
    const invitation = await this.invitationValide(jeton);
    if (String(motDePasse ?? '').length < 10) {
      throw new BadRequestException('Le mot de passe doit contenir au moins 10 caractères.');
    }

    const base = (process.env.KEYCLOAK_ADMIN_URL || process.env.KEYCLOAK_URL || '').replace(/\/$/, '');
    if (!base) {
      throw new ServiceUnavailableException('Activation indisponible : Keycloak n’est pas configuré.');
    }
    const realm = process.env.KEYCLOAK_REALM || 'Elara';
    const token = await this.jetonAdmin(base);
    if (!token) {
      throw new ServiceUnavailableException('Activation indisponible : administration Keycloak refusée.');
    }

    const compte = invitation.user_id
      ? await this.prisma.user.findUnique({ where: { id: invitation.user_id } })
      : null;
    const email = compte?.email ?? invitation.email;
    const nom = compte?.nom ?? invitation.email;

    let sujet = compte?.keycloak_subject_id ?? null;
    if (!sujet) sujet = await this.sujetParEmail(base, realm, email, token);

    if (sujet && compte?.mot_de_passe_defini_le) {
      throw new ConflictException(
        'Ce compte est déjà actif : son mot de passe ne peut pas être modifié par un lien d’invitation. Connectez-vous avec vos identifiants habituels.',
      );
    }

    if (sujet) {
      const r = await fetch(`${base}/admin/realms/${realm}/users/${sujet}/reset-password`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password', value: motDePasse, temporary: false }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!r.ok) {
        throw new ServiceUnavailableException(`Keycloak a refusé l’activation (HTTP ${r.status}).`);
      }
    } else {
      const r = await fetch(`${base}/admin/realms/${realm}/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email,
          email,
          ...this.identite(nom, ''),
          enabled: true,
          emailVerified: true,
          credentials: [{ type: 'password', value: motDePasse, temporary: false }],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (r.status === 409) {
        throw new ConflictException('Un compte existe déjà pour cette adresse.');
      }
      if (!r.ok) {
        throw new ServiceUnavailableException(`Keycloak a refusé l’activation (HTTP ${r.status}).`);
      }
      sujet = String(r.headers.get('location') ?? '').split('/').pop() || (await this.sujetParEmail(base, realm, email, token));
    }

    // L'empreinte est mémorisée avant l'invalidation du lien : si cette
    // dernière écriture échoue, l'invitation reste utilisable et l'invitée
    // recommence au lieu de se retrouver sans accès ni erreur.
    if (compte) {
      await this.prisma.user.update({
        where: { id: compte.id },
        data: {
          keycloak_subject_id: sujet ?? compte.keycloak_subject_id,
          // Le compte devient actif : plus aucune invitation ne pourra réécrire
          // ce mot de passe.
          mot_de_passe_defini_le: new Date(),
        },
      });
    }
    await this.prisma.invitation.update({
      where: { jeton_hash: this.empreinte(jeton) },
      data: { utilise_le: new Date() },
    });

    return {
      ok: true,
      email,
      entreprise: invitation.tenant.raison_sociale,
    };
  }

  /** Ce que l'écran d'activation affiche avant de saisir un mot de passe. */
  async decrireActivation(jeton: string) {
    const invitation = await this.invitationValide(jeton);
    return {
      email: invitation.email,
      entreprise: invitation.tenant.raison_sociale,
      expire_le: invitation.expire_le.toISOString(),
    };
  }

  /** Change le rôle d'un compte dans cette organisation. */
  async changerRole(tenantId: string, id: string, role: string, auteurId?: string) {
    await this.exigerAdmin(tenantId, auteurId ?? '');
    const valide = this.validerRole(role);
    const compte = await this.exiger(tenantId, id);

    // Le rôle est avant tout un rôle *par organisation* (colonne
    // `user_tenants.role`). Réécrire `users.role` à chaque fois ferait qu'un
    // changement dans une entreprise s'applique à toutes les autres : on ne le
    // fait que si l'organisation visée est bien l'organisation principale.
    await this.prisma.userTenant.updateMany({
      where: { user_id: compte.id, tenant_id: tenantId },
      data: { role: valide },
    });
    if (compte.tenant_id === tenantId) {
      await this.prisma.user.update({ where: { id: compte.id }, data: { role: valide } });
    }
    return { id: compte.id, role: valide, mis_a_jour: true };
  }

  async retirer(tenantId: string, id: string, auteurId?: string) {
    await this.exigerAdmin(tenantId, auteurId ?? '');
    const compte = await this.exiger(tenantId, id);
    await this.prisma.userTenant.deleteMany({ where: { user_id: compte.id, tenant_id: tenantId } });

    const autres = await this.prisma.userTenant.findMany({
      where: { user_id: compte.id },
      select: { tenant_id: true },
    });

    if (autres.length === 0) {
      await this.prisma.user.update({ where: { id: compte.id }, data: { deleted_at: new Date() } });
      return { id: compte.id, retire: true, autres_organisations: 0 };
    }

    // Le compte reste actif, mais `users.tenant_id` pointait peut-être vers
    // l'organisation qu'on vient de quitter. Sans cette reprise, l'accès
    // principal continuerait d'ouvrir la porte de l'organisation retirée :
    // `hasAccess` teste `users.tenant_id` avant tout le reste.
    if (compte.tenant_id === tenantId) {
      await this.prisma.user.update({
        where: { id: compte.id },
        data: { tenant_id: autres[0].tenant_id },
      });
    }

    return { id: compte.id, retire: true, autres_organisations: autres.length };
  }

  /**
   * Crée l'identité Keycloak du compte, puis enregistre le sujet.
   *
   * Trois pièges déjà rencontrés en conditions réelles, et qui laissaient
   * tous les comptes invités incapables de se connecter :
   *
   * 1. Le jeton d'administration ne se dépose pas à la main : il est court et
   *    expire. On l'obtient à chaque appel, et le compte de service est
   *    préféré au compte master.
   * 2. Le realm s'écrit `Elara` (E majuscule) : la minuscylée ne désigne
   *    aucun realm et l'appel échoue.
   * 3. La création d'un utilisateur répond 201 **avec un corps vide** : lire
   *    du JSON lève une exception, donc `keycloak_subject_id` n'était jamais
   *    écrit et le compte ne pouvait jamais correspondre à une session.
   */
  private async provisionner(userId: string, email: string, nom: string) {
    const compte = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { keycloak_subject_id: true, mot_de_passe_defini_le: true },
    });
    if (compte?.keycloak_subject_id) {
      // L'identité existe déjà : elle peut être une invitation encore en
      // attente — aucun mot de passe n'a été posé, un nouveau lien est donc
      // utile — ou un compte actif, auquel cas l'activation ne doit plus rien
      // changer.
      return {
        fournisseur: 'keycloak',
        etat: 'provisionne',
        sujet: compte.keycloak_subject_id,
        nouvelle_identite: compte.mot_de_passe_defini_le === null,
      };
    }

    const base = (process.env.KEYCLOAK_ADMIN_URL || process.env.KEYCLOAK_URL || '').replace(/\/$/, '');
    if (!base) {
      return { fournisseur: 'keycloak', etat: 'en_attente', raison: 'Keycloak non configuré' };
    }
    const realm = process.env.KEYCLOAK_REALM || 'Elara';

    try {
      const token = await this.jetonAdmin(base);
      if (!token) {
        return {
          fournisseur: 'keycloak',
          etat: 'en_attente',
          raison: 'Identifiants d’administration Keycloak non configurés',
        };
      }

      const reponse = await fetch(`${base}/admin/realms/${realm}/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email,
          email,
          ...this.identite(nom, ''),
          enabled: true,
          emailVerified: false,
          // Aucun mot de passe : l'identité est créée sans moyen de se
          // connecter. C'est ce qui distingue une invitation en attente d'un
          // compte déjà actif, sans rien stocker de notre côté. Le lien
          // d'activation pose le premier mot de passe.
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (reponse.status === 409) {
        // L'identité existe déjà dans Keycloak : on la récupère au lieu d'en
        // créer une seconde, sinon le compte deviendrait injoignable.
        const sujet = await this.sujetParEmail(base, realm, email, token);
        if (sujet) {
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              keycloak_subject_id: sujet,
              // Identité trouvée dans Keycloak sans ligne de compte ici : rien ne
              // prouve qu'elle n'a jamais eu de mot de passe, donc aucun lien
              // n'est émis. Cette décision doit être mémorisée : la laisser
              // « en attente » faisait qu'une seconde invitation de la même
              // adresse émettait un lien, et l'activation réécrivait alors le mot
              // de passe d'un compte préexistant.
              mot_de_passe_defini_le: new Date(),
            },
          });
          return { fournisseur: 'keycloak', etat: 'provisionne', sujet, nouvelle_identite: false };
        }
        return { fournisseur: 'keycloak', etat: 'erreur', code: 409, raison: 'Identité existante non résolue' };
      }
      if (!reponse.ok) {
        return { fournisseur: 'keycloak', etat: 'erreur', code: reponse.status };
      }

      // 201 sans corps : l'identifiant est dans l'en-tête Location.
      let sujet: string | null | undefined = String(reponse.headers.get('location') ?? '').split('/').pop();
      if (!sujet) sujet = await this.sujetParEmail(base, realm, email, token);
      if (!sujet) return { fournisseur: 'keycloak', etat: 'erreur', raison: 'Sujet non récupéré' };

      await this.prisma.user.update({ where: { id: userId }, data: { keycloak_subject_id: sujet } });
      return { fournisseur: 'keycloak', etat: 'provisionne', sujet, nouvelle_identite: true };
    } catch (e: any) {
      this.logger.warn(`Provisionnement Keycloak impossible pour ${email} : ${e?.message ?? e}`);
      return { fournisseur: 'keycloak', etat: 'erreur', raison: e?.message ?? 'injoignable' };
    }
  }

  /**
   * Jeton d'administration Keycloak, rafraîchi à chaque appel.
   *
   * Compte de service en priorité (c'est le bon usage en production), compte
   * master en repli pour le développement.
   */
  /**
   * Prénom et nom tels que Keycloak les attend.
   *
   * Le profil utilisateur du realm rend `firstName` et `lastName` tous deux
   * obligatoires. Un compte créé avec un seul des deux est refusé à la
   * connexion — Keycloak répond « Account is not fully set up » — alors même
   * que tout le reste est correct. C'est invisible depuis l'API, qui renvoie
   * pourtant une création réussie.
   */
  private identite(firstName: string, lastName: string) {
    const a = firstName.trim();
    const b = lastName.trim();
    if (a && b) return { firstName: a, lastName: b };
    // Un seul nom a été fourni : on le répartit au mieux, le dernier mot
    // servant de nom de famille.
    const parts = (a || b).split(/\s+/).filter(Boolean);
    if (!parts.length) return { firstName: 'Utilisateur', lastName: 'Elara' };
    if (parts.length === 1) return { firstName: parts[0], lastName: 'Elara' };
    return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
  }

  private async jetonAdmin(base: string): Promise<string | null> {
    const clientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID;
    const clientSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;
    if (clientId && clientSecret) {
      const r = await fetch(`${base}/realms/master/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (r.ok) return (await r.json()).access_token as string;
    }

    const login = process.env.KEYCLOAK_ADMIN_USERNAME;
    const password = process.env.KEYCLOAK_ADMIN_PASSWORD;
    if (login && password) {
      const r = await fetch(`${base}/realms/master/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: process.env.KEYCLOAK_ADMIN_CLI_ID || 'admin-cli',
          username: login,
          password,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (r.ok) return (await r.json()).access_token as string;
    }

    return null;
  }

  /** Retrouve l'identifiant interne d'un utilisateur Keycloak par son e-mail. */
  private async sujetParEmail(base: string, realm: string, email: string, token: string): Promise<string | null> {
    const r = await fetch(
      `${base}/admin/realms/${realm}/users?username=${encodeURIComponent(email)}&exact=true`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) },
    );
    if (!r.ok) return null;
    const liste = (await r.json()) as Array<{ id?: string }>;
    return liste[0]?.id ?? null;
  }

  private validerRole(role: unknown): Role {
    if (!ROLES.includes(role as Role)) {
      throw new BadRequestException(`Rôle invalide. Attendu : ${ROLES.join(', ')}.`);
    }
    return role as Role;
  }

  private async exiger(tenantId: string, id: string) {
    const compte = await this.prisma.user.findFirst({ where: { id, deleted_at: null } });
    if (!compte) throw new NotFoundException('Utilisateur introuvable.');
    const membre = await this.prisma.userTenant.findUnique({
      where: { user_id_tenant_id: { user_id: compte.id, tenant_id: tenantId } },
    });
    const proprietaire = compte.tenant_id === tenantId;
    if (!membre && !proprietaire) {
      throw new NotFoundException('Cet utilisateur n’appartient pas à votre organisation.');
    }
    return compte;
  }

  private versCompte(
    id: string,
    email: string,
    nom: string,
    role: string,
    multiOrganisation: boolean,
    created_at: Date,
  ) {
    return {
      id,
      email,
      nom,
      role,
      multi_organisation: multiOrganisation,
      created_at,
    };
  }
}
