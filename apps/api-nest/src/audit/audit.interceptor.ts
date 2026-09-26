import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../prisma.service.js';

/** Méthodes qui modifient l'état et doivent laisser une trace. */
const METHODES_AUDITEES = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Écrit chaque mutation dans `audit_trail`.
 *
 * L'écriture est volontairement hors du chemin critique : elle part du
 * `tap()` après la route, donc un échec de l'audit n'annule pas l'action
 * métier, et une action métier échouée est tracée comme telle. C'est ce
 * journal que la page « Sécurité » affiche.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (!METHODES_AUDITEES.includes(request.method)) return next.handle();

    const roles: string[] = Array.isArray(request.user?.roles) ? request.user.roles : [];
    const trace = {
      tenant_id: request.tenantId ?? request.user?.tenantId ?? 'SYSTEM',
      acteur_type: roles.includes('assistant_ia_systeme')
        ? 'systeme_ia'
        : roles.includes('integration_externe')
          ? 'integration'
          : 'utilisateur',
      acteur_id: String(request.user?.userId ?? 'ANONYMOUS'),
      action: `${request.method} ${request.originalUrl ?? request.url}`,
      entite_concernee: this.entiteDe(request.originalUrl ?? request.url),
    };

    return next.handle().pipe(
      tap({
        next: () => void this.enregistrer(trace, 'SUCCESS', request.body),
        error: (error) =>
          void this.enregistrer(trace, 'FAILED', request.body, error?.message ?? 'erreur inconnue'),
      }),
    );
  }

  /**
   * `POST /v1/memoire/factures` → `factures` : le segment après le préfixe
   * de version. Les routes imbriquées gardent les deux segments pour rester
   * exploitables dans un filtre (« clients/123 »).
   */
  private entiteDe(url: string): string {
    const segments = String(url).split('?')[0].split('/').filter(Boolean);
    const apresVersion = segments.findIndex((s) => /^v\d+$/.test(s));
    const rest = segments.slice(apresVersion >= 0 ? apresVersion + 1 : 0);
    return rest.slice(0, 2).join('/') || 'general';
  }

  private async enregistrer(
    trace: { tenant_id: string; acteur_type: string; acteur_id: string; action: string; entite_concernee: string },
    statut: 'SUCCESS' | 'FAILED',
    body: unknown,
    erreur?: string,
  ): Promise<void> {
    try {
      await this.prisma.auditTrail.create({
        data: {
          ...trace,
          statut,
          // Le corps peut contenir des données sensibles (mot de passe, NIU) :
          // on n'archrive que la forme des champs, jamais les valeurs.
          metadata: {
            champs: this.champsDe(body),
            ...(erreur ? { erreur } : {}),
          },
        },
      });
    } catch (e: any) {
      // L'API doit rester opérationnelle même si la table d'audit est absente
      // (migration non appliquée) : on trace l'incident sans le propager.
      this.logger.warn(`Journal d'audit non écrit (${trace.action}) : ${e?.message ?? e}`);
    }
  }

  private champsDe(body: unknown): string[] {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return [];
    return Object.keys(body as Record<string, unknown>).slice(0, 40);
  }
}
