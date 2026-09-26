import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantInterceptor } from '../tenant/tenant.interceptor.js';
import { AuditInterceptor } from '../audit/audit.interceptor.js';
import { TenantId } from '../tenant/tenant-id.decorator.js';
import { RhService } from './rh.service.js';

@ApiTags('Ressources humaines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor, AuditInterceptor)
@Controller('v1/rh')
export class RhController {
  constructor(private readonly rh: RhService) {}

  @Get('employes')
  @ApiOperation({ summary: 'Lister les employés et la masse salariale' })
  lister(@TenantId() tenantId: string) {
    return this.rh.lister(tenantId);
  }

  @Post('employes')
  @ApiOperation({ summary: 'Enregistrer un employé' })
  creer(@TenantId() tenantId: string, @Body() data: any) {
    return this.rh.creer(tenantId, data);
  }

  @Patch('employes/:id')
  @ApiOperation({ summary: 'Modifier un employé' })
  modifier(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.rh.modifier(tenantId, id, data);
  }

  @Delete('employes/:id')
  @ApiOperation({ summary: 'Supprimer un employé' })
  supprimer(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.rh.supprimer(tenantId, id);
  }
}
