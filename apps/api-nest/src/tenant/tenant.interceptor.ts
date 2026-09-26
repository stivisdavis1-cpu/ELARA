import { CallHandler, ExecutionContext, ForbiddenException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../prisma.service.js';

/**
 * Résout le tenant de la requête et le rattache à `request.tenantId`.
 *
 * Le tenant est fourni par l'en-tête `x-tenant-id` (choix du client web) ou
 * par le claim JWT. Il est ensuite **vérifié** contre les droits réels de
 * l'utilisateur : `user_tenants` (organisations multiples) ou `users`
 * (organisation principale). Sans cette vérification, un client pouvait
 * interroger les données d'un autre tenant en changeant d'en-tête.
 *
 * L'isolation reste applicative (filtre `tenant_id` sur chaque requête) :
 * les politiques RLS de 01_rls_and_triggers.sql dépendent d'un GUC que
 * l'API ne pose pas encore — voir infra/db/migrations/03_modules_metier.sql.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers['x-tenant-id'];
    const claimed = request.user?.tenantId;
    const tenantId = (Array.isArray(header) ? header[0] : header) ?? claimed;

    if (!tenantId) {
      throw new ForbiddenException("En-tête X-Tenant-Id manquant et aucun tenant dans le jeton");
    }

    const userId = request.user?.userId;
    if (userId) {
      const allowed = await this.hasAccess(String(userId), String(tenantId));
      if (!allowed && !this.isDevBypass(request)) {
        throw new ForbiddenException("Accès refusé : l'utilisateur n'appartient pas à cette organisation");
      }
    }

    request.tenantId = String(tenantId);
    // JwtStrategy ne retourne volontairement pas de tenant (un utilisateur
    // peut appartenir à plusieurs organisations), si bien que les
    // contrôleurs historiques lisent `req.user.tenantId`. On réinjecte ici le
    // tenant vérifié pour que ces lectures restent correctes. Le code nouveau
    // doit utiliser `@TenantId()`.
    if (request.user) request.user.tenantId = String(tenantId);
    return next.handle();
  }

  /** L'utilisateur appartient-il à ce tenant, par l'un des deux liens ? */
  private async hasAccess(userId: string, tenantId: string): Promise<boolean> {
    const [membership, owner] = await Promise.all([
      this.prisma.userTenant.findFirst({
        where: { user_id: userId, tenant_id: tenantId },
        select: { user_id: true },
      }),
      this.prisma.user.findFirst({
        where: { id: userId, tenant_id: tenantId, deleted_at: null },
        select: { id: true },
      }),
    ]);
    return Boolean(membership || owner);
  }

  /**
   * En développement JwtAuthGuard injecte un utilisateur factice sans ligne
   * en base : on ne peut pas exiger d'appartenance, sinon plus aucun écran
   * ne chargerait sur une base fraîche.
   */
  private isDevBypass(request: any): boolean {
    return process.env.NODE_ENV !== 'production' && String(request.user?.userId) === '123';
  }
}
