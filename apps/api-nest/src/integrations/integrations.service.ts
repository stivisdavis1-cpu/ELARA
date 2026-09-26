import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async lister(tenantId: string) {
    return this.prisma.integration.findMany({ where: { tenant_id: tenantId }, orderBy: { nom: 'asc' } });
  }

  async creer(tenantId: string, data: any) {
    const nom = String(data?.nom ?? '').trim();
    if (!nom) throw new BadRequestException('Le nom de lâ€™intÃ©gration est obligatoire.');
    const type = data?.type ?? 'webhook';
    const url = String(data?.url ?? '').trim();
    if (type === 'webhook' && !/^https?:\/\//i.test(url)) {
      throw new BadRequestException('Une URL http(s) est requise pour un connecteur webhook.');
    }
    const integration = await this.prisma.integration.create({
      data: {
        tenant_id: tenantId,
        nom,
        type,
        url: url || null,
        secret: data?.secret ? String(data.secret) : null,
        evenements: Array.isArray(data?.evenements) ? data.evenements : [],
        actif: false, // jamais actif Ã  la crÃ©ation : le test decide
        statut: 'inactif',
      },
    });
    // Le secret n'est jamais renvoyÃ© en clair, seulement son empreinte de contrÃ´le.
    return this.sansSecret(integration);
  }

  async modifier(tenantId: string, id: string, data: any) {
    const integration = await this.exiger(tenantId, id);
    const url = data?.url !== undefined ? String(data.url).trim() : integration.url;
    if ((data?.type ?? integration.type) === 'webhook' && !/^https?:\/\//i.test(url ?? '')) {
      throw new BadRequestException('Une URL http(s) est requise pour un connecteur webhook.');
    }
    const maj = await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        ...(data?.nom !== undefined ? { nom: String(data.nom).trim() } : {}),
        ...(data?.type !== undefined ? { type: data.type } : {}),
        ...(data?.url !== undefined ? { url: url || null } : {}),
        ...(data?.secret !== undefined ? { secret: data.secret ? String(data.secret) : null } : {}),
        ...(data?.evenements !== undefined ? { evenements: Array.isArray(data.evenements) ? data.evenements : [] } : {}),
        ...(data?.actif !== undefined ? { actif: Boolean(data.actif) } : {}),
      },
    });
    return this.sansSecret(maj);
  }

  async supprimer(tenantId: string, id: string) {
    const integration = await this.exiger(tenantId, id);
    await this.prisma.integration.delete({ where: { id: integration.id } });
    return { supprime: true, id: integration.id };
  }

  /**
   * Envoie rÃ©ellement une requÃªte HTTP au connecteur et enregistre le code
   * obtenu. Le `statut` affichÃ© dans l'interface est donc le retour du
   * destinataire, pas une valeur supposÃ©e.
   */
  async tester(tenantId: string, id: string) {
    const integration = await this.exiger(tenantId, id);
    if (!integration.url) throw new BadRequestException('Aucun URL configurÃ©e sur ce connecteur.');
    return this.envoyer(integration, { evenement: 'test', message: 'PING ELARA', integration: integration.nom });
  }

  /**
   * Diffuse un Ã©vÃ©nement aux connecteurs actifs qui l'ont souscrit.
   * Retourne un dÃ©compte par connecteur, appelÃ© aussi par le moteur de
   * workflow pour l'action Â« webhook Â».
   */
  async diffuser(tenantId: string, evenement: string, charge: Record<string, unknown>) {
    const connecteurs = await this.prisma.integration.findMany({
      where: { tenant_id: tenantId, actif: true, type: 'webhook' },
    });

    const concernes = connecteurs.filter((c) => {
      const liste = Array.isArray(c.evenements) ? (c.evenements as string[]) : [];
      return liste.length === 0 || liste.includes(evenement) || liste.includes('*');
    });

    const resultats: any[] = [];
    for (const connecteur of concernes) {
      resultats.push({
        integration: connecteur.nom,
        ...(await this.envoyer(connecteur, { evenement, ...charge })),
      });
    }
    return { connecteurs: connecteurs.length, concernes: concernes.length, resultats };
  }

  private async envoyer(
    connecteur: { id: string; nom: string; url: string | null; secret: string | null; tenant_id: string },
    charge: Record<string, unknown>,
  ) {
    const corps = JSON.stringify({ source: 'elara', envoye_le: new Date().toISOString(), ...charge });
    const entetes: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Elara-Integration': connecteur.nom,
    };
    // Le secret sert Ã  signer la charge utile : le destinataire peut vÃ©rifier
    // que l'appel vient bien de nous.
    if (connecteur.secret) {
      entetes['X-Elara-Signature'] = `sha256=${createHmac('sha256', connecteur.secret).update(corps).digest('hex')}`;
    }

    const debut = Date.now();
    try {
      const reponse = await fetch(connecteur.url as string, {
        method: 'POST',
        headers: entetes,
        body: corps,
        signal: AbortSignal.timeout(10_000),
      });
      await this.enregistrerAppel(connecteur.id, reponse.status, 'erreur');
      return { ok: reponse.ok, code: reponse.status, duree_ms: Date.now() - debut };
    } catch (e: any) {
      await this.enregistrerAppel(connecteur.id, 0, 'erreur');
      this.logger.warn(`Connecteur Â« ${connecteur.nom} Â» injoignable : ${e?.message ?? e}`);
      return { ok: false, code: 0, erreur: e?.message ?? 'injoignable', duree_ms: Date.now() - debut };
    }
  }

  private async enregistrerAppel(integrationId: string, code: number, statut: 'actif' | 'erreur') {
    try {
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: { dernier_appel: new Date(), dernier_statut: code, statut },
      });
    } catch (e: any) {
      this.logger.warn(`Statut du connecteur non mis Ã  jour : ${e?.message ?? e}`);
    }
  }

  private async exiger(tenantId: string, id: string) {
    const integration = await this.prisma.integration.findFirst({ where: { id, tenant_id: tenantId } });
    if (!integration) throw new NotFoundException('IntÃ©gration introuvable pour cette organisation.');
    return integration;
  }

  /** Masque le secret : seul un test permet de savoir s'il fonctionne. */
  private sansSecret<T extends { secret?: string | null }>(integration: T) {
    const { secret, ...reste } = integration;
    return { ...reste, secret_defini: Boolean(secret) };
  }
}

