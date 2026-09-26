import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantInterceptor } from '../tenant/tenant.interceptor.js';
import { AuditInterceptor } from '../audit/audit.interceptor.js';
import { TenantId } from '../tenant/tenant-id.decorator.js';
import { DocgenService } from './docgen.service.js';

@ApiTags('Génération de documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor, AuditInterceptor)
@Controller('v1/docgen')
export class DocgenController {
  constructor(private readonly docgen: DocgenService) {}

  @Get('templates')
  @ApiOperation({ summary: 'Lister les gabarits' })
  templates(@TenantId() tenantId: string) {
    return this.docgen.listerTemplates(tenantId);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Créer un gabarit' })
  creerTemplate(@TenantId() tenantId: string, @Body() data: any) {
    return this.docgen.creerTemplate(tenantId, data);
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: 'Modifier un gabarit' })
  modifierTemplate(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.docgen.modifierTemplate(tenantId, id, data);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Supprimer un gabarit' })
  supprimerTemplate(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.docgen.supprimerTemplate(tenantId, id);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Lister les documents générés' })
  documents(@TenantId() tenantId: string) {
    return this.docgen.listerDocuments(tenantId);
  }

  @Post('generer')
  @ApiOperation({ summary: 'Générer un document depuis un gabarit' })
  generer(@TenantId() tenantId: string, @Req() req: any, @Body() data: any) {
    return this.docgen.generer(tenantId, data, req.user?.userId);
  }

  @Get('documents/:id/telecharger')
  @ApiOperation({ summary: 'Télécharger le .docx généré' })
  async telecharger(@TenantId() tenantId: string, @Param('id') id: string, @Query('format') format?: string) {
    const { nom, buffer } = await this.docgen.telecharger(tenantId, id);
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      disposition: `attachment; filename="${encodeURIComponent(nom)}"`,
    });
  }

  @Patch('documents/:id/statut')
  @ApiOperation({ summary: 'Changer le statut d’un document généré' })
  changerStatut(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.docgen.changerStatut(tenantId, id, String(data?.statut ?? ''));
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Supprimer un document généré' })
  supprimerDocument(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.docgen.supprimerDocument(tenantId, id);
  }
}
