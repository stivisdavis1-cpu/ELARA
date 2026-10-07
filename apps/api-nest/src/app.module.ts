import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { AuthModule } from './auth/auth.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { RbacModule } from './rbac/rbac.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuditInterceptor } from './audit/audit.interceptor.js';
import { ScannerModule } from './scanner/scanner.module.js';
import { MemoireModule } from './memoire/memoire.module.js';
import { CfoModule } from './cfo/cfo.module.js';
import { RapportModule } from './rapport/rapport.module.js';
import { AssistantModule } from './assistant/assistant.module.js';
import { IntegrationsModule } from './integrations/integrations.module.js';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module.js';
import { DocgenModule } from './docgen/docgen.module.js';
import { WorkflowModule } from './workflow/workflow.module.js';
import { ValidationModule } from './validation/validation.module.js';
import { UtilisateursModule } from './utilisateurs/utilisateurs.module.js';
import { RhModule } from './rh/rh.module.js';
import { ReglagesModule } from './reglages/reglages.module.js';
import { MarketingModule } from './marketing/marketing.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 100,
        },
      ],
      // Stockage DISTRIBUÉ : sans Redis, chaque instance compte ses propres
      // requêtes en mémoire — derrière 2+ réplicas, un attaquant multiplie sa
      // limite par le nombre d'instances. Redis unifie le compteur (même
      // REDIS_URL que BullMQ). Repli mémoire si Redis absent (dev sans Redis),
      // mais la prod échoue au démarrage si le stockage distribué manque : un
      // rate-limit silencieusement local en prod serait pire qu'un crash.
      storage: (() => {
        const url = process.env.REDIS_URL;
        if (url) return new ThrottlerStorageRedisService(url);
        if (process.env.NODE_ENV === 'production') {
          throw new Error(
            'REDIS_URL manquante : le rate-limit distribué est obligatoire en production.',
          );
        }
        return undefined;
      })(),
      // Derrière le proxy Next.js (rewrites) ou l'ingress, l'IP du visiteur
      // n'est pas `req.ip` (qui verrait toujours le proxy) : elle arrive dans
      // `x-forwarded-for`. On retient la DERNIÈRE adresse de la liste, celle
      // ajoutée par le proxy de confiance le plus proche. Limite assumée :
      // sans proxy qui complète l'en-tête, un client maître de celui-ci peut
      // changer de clé de limitation — d'où le pot de miel et l'e-mail unique
      // en base, qui restent les barrières réelles.
      getTracker: (req: any) => {
        const brut = req?.headers?.['x-forwarded-for'];
        const liste = (Array.isArray(brut) ? brut.join(',') : (brut ?? ''))
          .split(',')
          .map((morceau: string) => morceau.trim())
          .filter(Boolean);
        return liste[liste.length - 1] || req?.ip || req?.socket?.remoteAddress || 'inconnu';
      },
    }),
    AuthModule,
    TenantModule,
    RbacModule,
    AuditModule,
    ScannerModule,
    MemoireModule,
    CfoModule,
    RapportModule,
    AssistantModule,
    IntegrationsModule,
    RabbitMQModule,
    DocgenModule,
    WorkflowModule,
    ValidationModule,
    UtilisateursModule,
    RhModule,
    ReglagesModule,
    MarketingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      // Enregistré via DI (et non `new AuditInterceptor()`) pour recevoir
      // PrismaService : l'intercepteur écrit dans `audit_trail`.
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
