import { Module, Global } from '@nestjs/common';
import { TenantInterceptor } from './tenant.interceptor.js';
import { PrismaService } from '../prisma.service.js';

@Global()
@Module({
  providers: [TenantInterceptor, PrismaService],
  exports: [TenantInterceptor, PrismaService],
})
export class TenantModule {}
