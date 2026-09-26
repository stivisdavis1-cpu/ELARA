import { Body, Controller, Get, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantInterceptor } from '../tenant/tenant.interceptor.js';
import { AuditInterceptor } from '../audit/audit.interceptor.js';
import { TenantId } from '../tenant/tenant-id.decorator.js';
import { ReglagesService } from './reglages.service.js';

@ApiTags('Réglages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor, AuditInterceptor)
@Controller('v1/reglages')
export class ReglagesController {
  constructor(private readonly reglages: ReglagesService) {}

  @Get('profil')
  @ApiOperation({ summary: 'Profil de l’organisation' })
  profil(@TenantId() tenantId: string) {
    return this.reglages.profil(tenantId);
  }

  @Patch('profil')
  @ApiOperation({ summary: 'Modifier le profil de l’organisation' })
  modifierProfil(@TenantId() tenantId: string, @Body() data: any) {
    return this.reglages.modifierProfil(tenantId, data);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Volumétrie réelle et quotas' })
  usage(@TenantId() tenantId: string) {
    return this.reglages.usage(tenantId);
  }

  @Post('quotas')
  @ApiOperation({ summary: 'Définir le plan et les quotas' })
  definirQuotas(@TenantId() tenantId: string, @Body() data: any) {
    return this.reglages.definirQuotas(tenantId, data);
  }

  @Post('onboarding')
  @ApiOperation({ summary: 'Enregistrer les réponses d’onboarding' })
  onboarding(@TenantId() tenantId: string, @Body() data: any) {
    return this.reglages.enregistrerOnboarding(tenantId, data?.reponses ?? {});
  }
}
