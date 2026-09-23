import { Controller, Get, Post, UseGuards, UseInterceptors, NotImplementedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantInterceptor } from '../tenant/tenant.interceptor.js';
import { AuditInterceptor } from '../audit/audit.interceptor.js';

@ApiTags('Rapport IA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor, AuditInterceptor)
@Controller('v1/rapport')
export class RapportController {

  @Post('generer')
  @ApiOperation({ summary: 'Générer un rapport de santé manuellement' })
  generateRapport() {
    throw new NotImplementedException('Le module Rapport IA n\'est pas encore implémenté.');
  }

  @Get()
  @ApiOperation({ summary: 'Lister l\'historique des rapports' })
  getRapports() {
    throw new NotImplementedException('Le module Rapport IA n\'est pas encore implémenté.');
  }
}
