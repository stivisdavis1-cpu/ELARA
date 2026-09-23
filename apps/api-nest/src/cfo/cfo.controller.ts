import { Controller, Get, Post, Body, UseGuards, UseInterceptors, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantInterceptor } from '../tenant/tenant.interceptor.js';
import { AuditInterceptor } from '../audit/audit.interceptor.js';
import { CfoService } from './cfo.service.js';
import { TaxAgentService } from './tax-agent.service.js';

@ApiTags('CFO IA - Expert System')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor, AuditInterceptor)
@Controller('v1/cfo')
export class CfoController {
  
  constructor(
    private readonly cfoService: CfoService,
    private readonly taxAgentService: TaxAgentService
  ) {}

  // ==================================================
  // 1. SANTÉ & LIQUIDITÉ
  // ==================================================
  
  @Get('cashflow/synthese')
  @ApiOperation({ summary: 'Obtenir la synthèse de trésorerie' })
  getSyntheseTresorerie(@Req() req: any) {
    return this.cfoService.getSyntheseTresorerie(req.user.tenantId);
  }

  @Get('cashflow/bfr')
  @ApiOperation({ summary: 'Calculer le Besoin en Fonds de Roulement (BFR)' })
  getBFR(@Req() req: any) {
    return this.cfoService.getBFR(req.user.tenantId);
  }

  @Get('cashflow/runway')
  @ApiOperation({ summary: 'Estimer le Cash Runway (mois de survie)' })
  getRunway(@Req() req: any) {
    return this.cfoService.getCashRunway(req.user.tenantId);
  }

  // ==================================================
  // 2. RISQUES & CONFORMITÉ
  // ==================================================

  @Get('risques/balance-agee')
  @ApiOperation({ summary: 'Obtenir la balance âgée des créances clients' })
  getBalanceAgee(@Req() req: any) {
    return this.cfoService.getBalanceAgee(req.user.tenantId);
  }

  @Get('risques/tva-estimee')
  @ApiOperation({ summary: 'Obtenir l\'estimation de la TVA (Collectée / Déductible)' })
  getTvaEstimee(@Req() req: any) {
    return this.cfoService.getTvaEstimee(req.user.tenantId);
  }

  @Get('risques/anomalies')
  @ApiOperation({ summary: 'Obtenir les anomalies silencieuses détectées par l\'IA (Shadow Alerts)' })
  getAnomalies(@Req() req: any) {
    return this.cfoService.getAnomalies(req.user.tenantId);
  }

  // ==================================================
  // 3. APPRENTISSAGE CONTINU & STRATÉGIE
  // ==================================================

  @Post('parametres/strategie')
  @ApiOperation({ summary: 'Définir la stratégie financière pour aligner les conseils IA' })
  @ApiBody({ schema: { example: { strategie: 'preservation_cash' } } })
  setStrategie(@Req() req: any, @Body() data: { strategie: string }) {
    return this.cfoService.setStrategieTenant(req.user.tenantId, data.strategie);
  }

  @Get('parametres/strategie')
  @ApiOperation({ summary: 'Obtenir la stratégie actuelle' })
  getStrategie(@Req() req: any) {
    return this.cfoService.getStrategieTenant(req.user.tenantId);
  }

  // ==================================================
  // 4. AGENTS EXPERTS INDÉPENDANTS
  // ==================================================

  @Post('tax-rules/update')
  @ApiOperation({ summary: 'Déclencher l\'agent de mise à jour des règles fiscales' })
  @ApiBody({ schema: { example: { countries: ['SN', 'CM', 'CI'] } } })
  async updateTaxRules(@Req() req: any, @Body() data: { countries: string[] }) {
    return await this.taxAgentService.runAgent(req.user.tenantId, data.countries || []);
  }
}
