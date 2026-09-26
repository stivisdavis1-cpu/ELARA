import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantInterceptor } from '../tenant/tenant.interceptor.js';
import { AuditInterceptor } from '../audit/audit.interceptor.js';
import { TenantId } from '../tenant/tenant-id.decorator.js';
import { WorkflowService } from './workflow.service.js';

@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor, AuditInterceptor)
@Controller('v1/workflows')
export class WorkflowController {
  constructor(private readonly workflows: WorkflowService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les workflows' })
  lister(@TenantId() tenantId: string) {
    return this.workflows.lister(tenantId);
  }

  @Get('catalogue')
  @ApiOperation({ summary: 'Événements et champs disponibles pour les conditions' })
  catalogue(@TenantId() tenantId: string) {
    return this.workflows.catalogueCibles(tenantId);
  }

  @Get('executions')
  @ApiOperation({ summary: 'Historique des exécutions' })
  historique(@TenantId() tenantId: string, @Query('limit') limit?: string) {
    return this.workflows.historique(tenantId, Number(limit) || 50);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un workflow' })
  creer(@TenantId() tenantId: string, @Body() data: any) {
    return this.workflows.creer(tenantId, data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier ou activer/désactiver un workflow' })
  modifier(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.workflows.modifier(tenantId, id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un workflow' })
  supprimer(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.workflows.supprimer(tenantId, id);
  }

  @Post(':id/executer')
  @ApiOperation({ summary: 'Exécuter un workflow maintenant' })
  executer(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.workflows.executer(tenantId, id, 'manuel');
  }

  @Post('executer-tous')
  @ApiOperation({ summary: 'Exécuter tous les workflows actifs' })
  executerTous(@TenantId() tenantId: string, @Body() data: any) {
    return this.workflows.executerTous(tenantId, data?.evenement);
  }
}
