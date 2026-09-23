import { CallHandler, ExecutionContext, Injectable, NestInterceptor, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
// import { PrismaService } from '../prisma/prisma.service'; // A implémenter plus tard

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  // constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];
    const user = request.user; // Injecté par JwtAuthGuard

    if (!tenantId) {
      throw new ForbiddenException('X-Tenant-Id header manquant');
    }

    // TODO: Requête Prisma pour vérifier que 'user.userId' a accès à 'tenantId' dans 'user_tenants'
    // const hasAccess = await this.prisma.userTenant.findUnique({ ... })
    
    // Attachement au contexte pour Prisma RLS
    request.tenantId = tenantId;

    return next.handle();
  }
}
