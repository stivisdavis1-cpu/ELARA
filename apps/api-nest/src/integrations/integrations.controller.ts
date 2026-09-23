import { Controller, Get, Post, UseGuards, UseInterceptors, NotImplementedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantInterceptor } from '../tenant/tenant.interceptor.js';
import { AuditInterceptor } from '../audit/audit.interceptor.js';

@ApiTags('Intégrations API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor, AuditInterceptor)
@Controller('v1/integrations')
export class IntegrationsController {

  @Post('webhooks')
  @ApiOperation({ summary: 'Enregistrer un webhook' })
  registerWebhook() {
    throw new NotImplementedException('Le module Intégrations API n\'est pas encore implémenté.');
  }
}
