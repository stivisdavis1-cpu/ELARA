import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Résout le tenant de la requête en priorité depuis `request.tenantId`
 * (posé et vérifié par TenantInterceptor), puis en repli sur le claim JWT.
 *
 * Les contrôleurs ne doivent plus lire `req.user.tenantId` : JwtStrategy ne
 * retourne pas de tenant (un utilisateur peut appartenir à plusieurs
 * organisations via `user_tenants`), ce qui rendait cette lecture
 * `undefined` en production et faisait fuiter des lectures sans tenant.
 */
export const TenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const tenantId = request.tenantId ?? request.user?.tenantId;
  return tenantId as string;
});
