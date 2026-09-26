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

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 100,
        },
      ],
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
