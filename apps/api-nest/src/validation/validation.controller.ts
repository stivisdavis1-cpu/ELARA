import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantInterceptor } from '../tenant/tenant.interceptor.js';
import { AuditInterceptor } from '../audit/audit.interceptor.js';
import { TenantId } from '../tenant/tenant-id.decorator.js';
import { ValidationService } from './validation.service.js';

@ApiTags('Validations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor, AuditInterceptor)
@Controller('v1/validations')
export class ValidationController {
  constructor(private readonly validations: ValidationService) {}

  @Get()
  @ApiOperation({ summary: 'File de validation' })
  lister(@TenantId() tenantId: string, @Query('statut') statut?: string) {
    return this.validations.lister(tenantId, statut);
  }

  @Get('compteurs')
  @ApiOperation({ summary: 'Répartition des décisions' })
  compteurs(@TenantId() tenantId: string) {
    return this.validations.compteurs(tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Soumettre une demande de validation' })
  creer(@TenantId() tenantId: string, @Body() data: any) {
    return this.validations.creer(tenantId, data);
  }

  @Post(':id/approuver')
  @ApiOperation({ summary: 'Approuver une demande' })
  approuver(@TenantId() tenantId: string, @Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.validations.decider(tenantId, id, 'approuvee', req.user?.userId, data?.motif);
  }

  @Post(':id/rejeter')
  @ApiOperation({ summary: 'Rejeter une demande' })
  rejeter(@TenantId() tenantId: string, @Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.validations.decider(tenantId, id, 'rejetee', req.user?.userId, data?.motif);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une demande' })
  supprimer(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.validations.supprimer(tenantId, id);
  }
}
