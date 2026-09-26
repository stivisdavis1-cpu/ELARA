import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

const STATUTS = ['actif', 'conge', 'sorti'] as const;

@Injectable()
export class RhService {
  private readonly logger = new Logger(RhService.name);

  constructor(private readonly prisma: PrismaService) {}

  async lister(tenantId: string) {
    const employes = await this.prisma.employe.findMany({
      where: { tenant_id: tenantId },
      orderBy: [{ statut: 'asc' }, { nom: 'asc' }],
    });
    const effectif = employes.filter((e) => e.statut === 'actif');
    const masse = effectif.reduce((somme, e) => somme + Number(e.salaire_base ?? 0), 0);
    return {
      employes,
      resume: {
        effectif: effectif.length,
        total: employes.length,
        en_conge: employes.filter((e) => e.statut === 'conge').length,
        partis: employes.filter((e) => e.statut === 'sorti').length,
        masse_salariale: masse,
        masse_annuelle: masse * 12,
        // L'ancienneté moyenne n'a de sens que sur l'effectif présent.
        anciennete_moyenne_ans: this.ancienneteMoyenne(effectif),
      },
    };
  }

  async creer(tenantId: string, data: any) {
    const nom = String(data?.nom ?? '').trim();
    if (!nom) throw new BadRequestException('Le nom de l’employé est obligatoire.');
    const email = data?.email ? String(data.email).trim().toLowerCase() : null;
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new BadRequestException('Adresse e-mail invalide.');
    }
    return this.prisma.employe.create({
      data: {
        tenant_id: tenantId,
        nom,
        email,
        telephone: data?.telephone ?? null,
        fonction: data?.fonction ?? null,
        departement: data?.departement ?? null,
        type_contrat: data?.type_contrat ?? 'CDI',
        salaire_base: data?.salaire_base != null ? Number(data.salaire_base) : null,
        date_embauche: data?.date_embauche ? new Date(data.date_embauche) : null,
        statut: STATUTS.includes(data?.statut) ? data.statut : 'actif',
      },
    });
  }

  async modifier(tenantId: string, id: string, data: any) {
    await this.exiger(tenantId, id);
    if (data?.statut && !STATUTS.includes(data.statut)) {
      throw new BadRequestException(`Statut invalide. Attendu : ${STATUTS.join(', ')}.`);
    }
    return this.prisma.employe.update({
      where: { id },
      data: {
        ...(data?.nom !== undefined ? { nom: String(data.nom).trim() } : {}),
        ...(data?.email !== undefined ? { email: data.email ? String(data.email).toLowerCase() : null } : {}),
        ...(data?.telephone !== undefined ? { telephone: data.telephone } : {}),
        ...(data?.fonction !== undefined ? { fonction: data.fonction } : {}),
        ...(data?.departement !== undefined ? { departement: data.departement } : {}),
        ...(data?.type_contrat !== undefined ? { type_contrat: data.type_contrat } : {}),
        ...(data?.salaire_base !== undefined
          ? { salaire_base: data.salaire_base != null ? Number(data.salaire_base) : null }
          : {}),
        ...(data?.date_embauche !== undefined
          ? { date_embauche: data.date_embauche ? new Date(data.date_embauche) : null }
          : {}),
        ...(data?.statut !== undefined ? { statut: data.statut } : {}),
      },
    });
  }

  async supprimer(tenantId: string, id: string) {
    const employe = await this.exiger(tenantId, id);
    await this.prisma.employe.delete({ where: { id: employe.id } });
    return { supprime: true, id: employe.id };
  }

  private async exiger(tenantId: string, id: string) {
    const employe = await this.prisma.employe.findFirst({ where: { id, tenant_id: tenantId } });
    if (!employe) throw new NotFoundException('Employé introuvable pour cette organisation.');
    return employe;
  }

  private ancienneteMoyenne(employes: { date_embauche: Date | null }[]): number {
    const dues = employes
      .map((e) => e.date_embauche)
      .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()));
    if (!dues.length) return 0;
    const total = dues.reduce((somme, d) => somme + (Date.now() - d.getTime()), 0) / dues.length;
    return Number((total / (365.25 * 86_400_000)).toFixed(1));
  }
}
