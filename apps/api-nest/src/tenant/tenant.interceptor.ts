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
    const brut = Array.isArray(header) ? header[0] : header;
    // Format strict AVANT toute requête : l'en-tête voyage en clair, un
    // `../../`, un SQL ou un objet sérialisé ne doit jamais atteindre Prisma.
    const candidat = typeof brut === 'string' ? brut.trim() : request.user?.tenantId;
    if (typeof candidat !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(candidat)) {
      throw new ForbiddenException('Identifiant d’organisation invalide.');
    }
    const tenantId = candidat;

    const userId = request.user?.userId;
    if (userId) {
      const allowed = await this.hasAccess(String(userId), String(tenantId));
      if (!allowed) {
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

  /**
   * L'utilisateur a-t-il accès à ce tenant ?
   *
   * Deux précisions qui conditionnent toute la suite :
   *
   * 1. Le jeton porte le **sujet Keycloak** (`sub`), alors que `users.id` est
   *    un UUID interne. Les deux identifiants n'appartiennent pas au même
   *    espace : comparer le sujet à `users.id` ne peut jamais aboutir, et le
   *    403 devient systématique pour tout compte issu de Keycloak. C'est
   *    `users.keycloak_subject_id` qui fait le lien.
   *
   * 2. Un compte peut piloter plusieurs entreprises : son organisation
   *    principale (`users.tenant_id`) plus une ligne par organisation
   *    supplémentaire dans `user_tenants`. Le compte est donc autorisé si le
   *    tenant demandé est *l'un* de ses tenant, pas seulement le principal.
   */
  private async hasAccess(subject: string, tenantId: string): Promise<boolean> {
    const compte = await this.prisma.user.findFirst({
      where: {
        deleted_at: null,
        OR: [{ keycloak_subject_id: subject }, { id: subject }],
      },
      select: { id: true, tenant_id: true },
    });
    if (!compte) return false;

    // Organisation principale.
    if (compte.tenant_id === tenantId) return true;

    // Organisations supplémentaires : c'est ce qui permet à un même compte de
    // piloter plusieurs entreprises avec une seule identité.
    const membre = await this.prisma.userTenant.findUnique({
      where: { user_id_tenant_id: { user_id: compte.id, tenant_id: tenantId } },
      select: { user_id: true },
    });
    return Boolean(membre);
  }
}
