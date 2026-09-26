import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service.js';

/** Rôles réellement acceptés par l'enum PostgreSQL `role_utilisateur`. */
const ROLES = ['admin_compte', 'utilisateur_standard', 'assistant_ia_systeme', 'integration_externe'] as const;
type Role = (typeof ROLES)[number];

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

  async invitation(tenantId: string, data: any, auteurId?: string) {
    const email = String(data?.email ?? '').trim().toLowerCase();
    const nom = String(data?.nom ?? '').trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new BadRequestException('Adresse e-mail invalide.');
    }
    if (!nom) throw new BadRequestException('Le nom est obligatoire.');
    const role = this.validerRole(data?.role);

    const existant = await this.prisma.user.findUnique({ where: { email } });
    if (existant) {
      // Un compte existant n'est pas dupliqué : on le rattache à l'organisation.
      await this.prisma.userTenant.upsert({
        where: { user_id_tenant_id: { user_id: existant.id, tenant_id: tenantId } },
        create: { user_id: existant.id, tenant_id: tenantId, role },
        update: { role },
      });
      return {
        ...this.versCompte(existant.id, existant.email, existant.nom, role, true, existant.created_at),
        deja_existant: true,
        identite: await this.provisionner(existant.id, email, nom),
      };
    }

    const utilisateur = await this.prisma.user.create({
      data: { tenant_id: tenantId, nom, email, role, created_at: new Date() },
    });
    await this.prisma.userTenant.create({
      data: { user_id: utilisateur.id, tenant_id: tenantId, role },
    });

    return {
      ...this.versCompte(utilisateur.id, utilisateur.email, utilisateur.nom, role, true, utilisateur.created_at),
      deja_existant: false,
      invite_par: auteurId ?? null,
      identite: await this.provisionner(utilisateur.id, email, nom),
    };
  }

  async changerRole(tenantId: string, id: string, role: string) {
    const valide = this.validerRole(role);
    const compte = await this.exiger(tenantId, id);
    await this.prisma.user.update({ where: { id: compte.id }, data: { role: valide } });
    await this.prisma.userTenant.updateMany({
      where: { user_id: compte.id, tenant_id: tenantId },
      data: { role: valide },
    });
    return { id: compte.id, role: valide, mis_a_jour: true };
  }

  async retirer(tenantId: string, id: string) {
    const compte = await this.exiger(tenantId, id);
    await this.prisma.userTenant.deleteMany({ where: { user_id: compte.id, tenant_id: tenantId } });
    // L'organisation principale est libérée ; le compte n'est pas supprimé
    // car il peut appartenir à d'autres organisations.
    const autres = await this.prisma.userTenant.count({ where: { user_id: compte.id } });
    if (autres === 0) {
      await this.prisma.user.update({ where: { id: compte.id }, data: { deleted_at: new Date() } });
    }
    return { id: compte.id, retire: true, autres_organisations: autres };
  }

  /**
   * Crée le compte dans Keycloak si l'API d'administration est configurée.
   * Sinon on le dit franchement plutôt que de laisser croire à une
   * invitation partie : le contrat reste en attente côté identité.
   */
  private async provisionner(userId: string, email: string, nom: string) {
    const base = process.env.KEYCLOAK_ADMIN_URL;
    const token = process.env.KEYCLOAK_ADMIN_TOKEN;
    const realm = process.env.KEYCLOAK_REALM || 'elara';
    if (!base || !token) {
      return { fournisseur: 'keycloak', etat: 'en_attente', raison: 'API d’administration Keycloak non configurée' };
    }
    try {
      const reponse = await fetch(`${base.replace(/\/$/, '')}/admin/realms/${realm}/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email,
          email,
          firstName: nom,
          enabled: true,
          emailVerified: false,
          credentials: [{ type: 'password', value: randomUUID(), temporary: true }],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!reponse.ok) {
        return { fournisseur: 'keycloak', etat: 'erreur', code: reponse.status };
      }
      const cree = (await reponse.json()) as { id: string };
      await this.prisma.user.update({ where: { id: userId }, data: { keycloak_subject_id: cree.id } });
      return { fournisseur: 'keycloak', etat: 'provisionne', sujet: cree.id };
    } catch (e: any) {
      this.logger.warn(`Provisionnement Keycloak impossible pour ${email} : ${e?.message ?? e}`);
      return { fournisseur: 'keycloak', etat: 'erreur', raison: e?.message ?? 'injoignable' };
    }
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
