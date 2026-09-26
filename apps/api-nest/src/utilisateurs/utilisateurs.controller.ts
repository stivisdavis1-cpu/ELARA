import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantInterceptor } from '../tenant/tenant.interceptor.js';
import { AuditInterceptor } from '../audit/audit.interceptor.js';
import { TenantId } from '../tenant/tenant-id.decorator.js';
import { UtilisateursService } from './utilisateurs.service.js';

@ApiTags('Utilisateurs & rôles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor, AuditInterceptor)
@Controller('v1/utilisateurs')
export class UtilisateursController {
  constructor(private readonly utilisateurs: UtilisateursService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les comptes de l’organisation' })
  lister(@TenantId() tenantId: string) {
    return this.utilisateurs.lister(tenantId);
  }

  @Post('inviter')
  @ApiOperation({ summary: 'Inviter un compte' })
  inviter(@TenantId() tenantId: string, @Req() req: any, @Body() data: any) {
    return this.utilisateurs.invitation(tenantId, data, req.user?.userId);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Changer le rôle d’un compte' })
  changerRole(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.utilisateurs.changerRole(tenantId, id, data?.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Retirer un compte de l’organisation' })
  retirer(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.utilisateurs.retirer(tenantId, id);
  }
}
