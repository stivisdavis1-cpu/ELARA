import { Global, Module } from '@nestjs/common';
import { AuditInterceptor } from './audit.interceptor.js';
import { AuditController } from './audit.controller.js';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditInterceptor],
  exports: [AuditInterceptor],
})
export class AuditModule {}
