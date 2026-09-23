import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
// import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  // constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // N'auditer que les actions de modification/administration (POST, PUT, DELETE)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const tenantId = request.tenantId || 'SYSTEM';
      const userId = request.user?.userId || 'ANONYMOUS';
      const actorType = request.user?.roles?.includes('systeme_ia') ? 'systeme_ia' : 'utilisateur';
      
      const auditLog = {
        tenant_id: tenantId,
        acteur_type: actorType,
        acteur_id: userId,
        action: `${request.method} ${request.url}`,
        entite_concernee: request.url.split('/')[1] || 'general',
      };

      // Exécution de la route puis enregistrement en asynchrone
      return next.handle().pipe(
        tap({
          next: () => {
            // this.prisma.auditTrail.create({ data: { ...auditLog, statut: 'SUCCESS' } });
            console.log(`[AUDIT - SUCCESS]`, auditLog);
          },
          error: (error) => {
            // this.prisma.auditTrail.create({ data: { ...auditLog, statut: 'FAILED', metadata: { error: error.message } } });
            console.log(`[AUDIT - FAILED]`, auditLog, error.message);
          }
        })
      );
    }

    return next.handle();
  }
}
