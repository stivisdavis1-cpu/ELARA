import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

const STATUTS = ['en_attente', 'approuvee', 'rejetee'] as const;
type Statut = (typeof STATUTS)[number];

@Injectable()
export class ValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(tenantId: string, statut?: string) {
    return this.prisma.validation.findMany({
      where: { tenant_id: tenantId, ...(statut ? { statut } : {}) },
      orderBy: [{ statut: 'asc' }, { created_at: 'desc' }],
      take: 200,
    });
  }

  async compteurs(tenantId: string) {
    const [en_attente, approuvee, rejetee] = await Promise.all([
      this.prisma.validation.count({ where: { tenant_id: tenantId, statut: 'en_attente' } }),
      this.prisma.validation.count({ where: { tenant_id: tenantId, statut: 'approuvee' } }),
      this.prisma.validation.count({ where: { tenant_id: tenantId, statut: 'rejetee' } }),
    ]);
    return { en_attente, approuvee, rejetee, total: en_attente + approuvee + rejetee };
  }

  async creer(tenantId: string, data: any) {
    const titre = String(data?.titre ?? '').trim();
    if (!titre) throw new BadRequestException('Le titre de la demande est obligatoire.');
    return this.prisma.validation.create({
      data: {
        tenant_id: tenantId,
        type: data?.type ?? 'ecriture',
        titre,
        detail: data?.detail ?? null,
        cible_type: data?.cible_type ?? null,
        cible_id: data?.cible_id ?? null,
        montant: data?.montant != null ? Number(data.montant) : null,
        donnees: data?.donnees ?? {},
        statut: 'en_attente',
      },
    });
  }

  /**
   * Décision humaine. Le refus exige un motif : une demande rejetée sans
   * explication n'est pas auditable, et le dossier d'audit la relira.
   */
  async decider(tenantId: string, id: string, statut: Statut, decideur: string | undefined, motif?: string) {
    if (!STATUTS.includes(statut) || statut === 'en_attente') {
      throw new BadRequestException(`Décision attendue : ${STATUTS.filter((s) => s !== 'en_attente').join(' ou ')}.`);
    }
    if (statut === 'rejetee' && !String(motif ?? '').trim()) {
      throw new BadRequestException('Un motif est obligatoire pour rejeter une demande.');
    }
    const existante = await this.exiger(tenantId, id);
    if (existante.statut !== 'en_attente') {
      throw new BadRequestException(`Cette demande a déjà été traitée (${existante.statut}).`);
    }
    return this.prisma.validation.update({
      where: { id: existante.id },
      data: {
        statut,
        motif: motif ?? null,
        decide_par: decideur ?? null,
        decide_at: new Date(),
      },
    });
  }

  async supprimer(tenantId: string, id: string) {
    const validation = await this.exiger(tenantId, id);
    await this.prisma.validation.delete({ where: { id: validation.id } });
    return { supprime: true, id: validation.id };
  }

  private async exiger(tenantId: string, id: string) {
    const validation = await this.prisma.validation.findFirst({ where: { id, tenant_id: tenantId } });
    if (!validation) throw new NotFoundException('Demande de validation introuvable.');
    return validation;
  }
}
