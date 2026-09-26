import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantInterceptor } from '../tenant/tenant.interceptor.js';
import { AuditInterceptor } from '../audit/audit.interceptor.js';
import { TenantId } from '../tenant/tenant-id.decorator.js';
import { IntegrationsService } from './integrations.service.js';

@ApiTags('Intégrations API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor, AuditInterceptor)
@Controller('v1/integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les connecteurs' })
  lister(@TenantId() tenantId: string) {
    return this.integrations.lister(tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un connecteur' })
  creer(@TenantId() tenantId: string, @Body() data: any) {
    return this.integrations.creer(tenantId, data);
  }

  @Post('webhooks')
  @ApiOperation({ summary: 'Créer un connecteur webhook' })
  creerWebhook(@TenantId() tenantId: string, @Body() data: any) {
    return this.integrations.creer(tenantId, { ...data, type: 'webhook' });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un connecteur' })
  modifier(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.integrations.modifier(tenantId, id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un connecteur' })
  supprimer(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.integrations.supprimer(tenantId, id);
  }

  @Post(':id/tester')
  @ApiOperation({ summary: 'Envoyer un PING réel au connecteur' })
  tester(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.integrations.tester(tenantId, id);
  }
}
