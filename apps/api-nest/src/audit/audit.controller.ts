import { Controller, Get, Query, UseGuards, UseInterceptors, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantInterceptor } from '../tenant/tenant.interceptor.js';
import { AuditInterceptor } from './audit.interceptor.js';
import { PrismaService } from '../prisma.service.js';

@ApiTags("Journal d'audit")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor, AuditInterceptor)
@Controller('v1/audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Journal des mutations du tenant. Les écritures viennent de
   * AuditInterceptor : filtrer par acteur, entité ou statut revient à
   * restreindre les lignes retournées, pas à les recalculer.
   */
  @Get('trail')
  @ApiOperation({ summary: "Consulter le journal d'audit" })
  async trail(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('acteur_id') acteurId?: string,
    @Query('entite') entite?: string,
    @Query('statut') statut?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const skip = Math.max(Number(offset) || 0, 0);

    const where: any = { tenant_id: req.tenantId };
    if (acteurId) where.acteur_id = acteurId;
    if (statut) where.statut = statut;
    if (entite) where.entite_concernee = { startsWith: entite };

    const [total, entrees] = await Promise.all([
      this.prisma.auditTrail.count({ where }),
      this.prisma.auditTrail.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take,
        skip,
      }),
    ]);

    return { data: entrees, meta: { total, limit: take, offset: skip } };
  }

  /** Synthèse des 30 derniers jours : c'est le bandeau de la page Sécurité. */
  @Get('resume')
  @ApiOperation({ summary: 'Synthèse chiffrée du journal' })
  async resume(@Req() req: any) {
    const depuis = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const where = { tenant_id: req.tenantId, created_at: { gte: depuis } };

    const [total, echecs, parActeur, parEntite] = await Promise.all([
      this.prisma.auditTrail.count({ where }),
      this.prisma.auditTrail.count({ where: { ...where, statut: 'FAILED' } }),
      this.prisma.auditTrail.groupBy({
        by: ['acteur_id', 'acteur_type'],
        where,
        _count: { _all: true },
        orderBy: { _count: { acteur_id: 'desc' } },
        take: 8,
      }),
      this.prisma.auditTrail.groupBy({
        by: ['entite_concernee'],
        where,
        _count: { _all: true },
        orderBy: { _count: { entite_concernee: 'desc' } },
        take: 8,
      }),
    ]);

    return {
      total,
      echecs,
      taux_echec: total ? Number(((echecs / total) * 100).toFixed(1)) : 0,
      par_acteur: parActeur.map((a) => ({
        acteur_id: a.acteur_id,
        acteur_type: a.acteur_type,
        total: a._count._all,
      })),
      par_entite: parEntite.map((e) => ({ entite: e.entite_concernee, total: e._count._all })),
    };
  }
}
