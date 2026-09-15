import { Controller, Post, Get, Param, UseGuards, UseInterceptors, UploadedFile, UploadedFiles, Req } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantInterceptor } from '../tenant/tenant.interceptor.js';
import { AuditInterceptor } from '../audit/audit.interceptor.js';
import { ScannerService } from './scanner.service.js';
import { EventPattern, Payload } from '@nestjs/microservices';

@ApiTags('Scanner')
@ApiBearerAuth()
@Controller('v1/scanner')
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post('documents')
  // @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Importer un nouveau document (PDF, Image) pour extraction IA' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadDocument(@UploadedFile() file: any, @Req() req: any) {
    const tenantId = req.user?.tenantId || 'test-tenant'; // injecté par JwtAuthGuard
    return this.scannerService.processNewDocument(tenantId, file);
  }

  @Post('documents/bulk')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(TenantInterceptor, AuditInterceptor, FilesInterceptor('files', 1000))
  @ApiOperation({ summary: 'Importer plusieurs documents en masse pour extraction IA' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async uploadDocumentsBulk(@UploadedFiles() files: any[], @Req() req: any) {
    const tenantId = req.user.tenantId; // injecté par JwtAuthGuard
    
    // On lance le traitement en parallèle pour chaque fichier
    // L'API répond quasi instantanément pendant que RabbitMQ absorbe la charge
    const results = await Promise.all(
        files.map(file => this.scannerService.processNewDocument(tenantId, file))
    );
    
    return {
        message: `${files.length} documents envoyés au scanner avec succès.`,
        details: results
    };
  }

  @Post('documents/preview')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Convertir la première page d\'un document en image pour OCR Zonal' })
  @ApiConsumes('multipart/form-data')
  async getDocumentPreview(@UploadedFile() file: any) {
    const imgBuffer = await this.scannerService.ocrService.convertToImage(file.buffer);
    return {
      imageBase64: `data:image/png;base64,${imgBuffer.toString('base64')}`
    };
  }

  @Post('documents/crop-ocr')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Extraire le texte d\'une zone précise d\'un document' })
  @ApiConsumes('multipart/form-data')
  async cropAndOcr(
    @UploadedFile() file: any, 
    @Req() req: any
  ) {
    const { x, y, width, height } = req.body;
    const text = await this.scannerService.ocrService.cropAndOcr(
      file.buffer, 
      file.mimetype, 
      { x: Number(x), y: Number(y), width: Number(width), height: Number(height) }
    );
    return { text };
  }

  @Get('search')
  @ApiOperation({ summary: 'Recherche plein texte et sémantique dans les documents lourds' })
  async searchDocument(@Req() req: any) {
    const q = req.query.q as string;
    // const tenantId = req.user?.tenantId || 'test-tenant';
    
    // In a real implementation we would do a vector search here via Prisma using pgvector:
    // const results = await this.prisma.$queryRaw`SELECT content, page_number FROM document_chunks WHERE document_id = ... ORDER BY embedding <-> ${embedding} LIMIT 5`
    
    // Mock response for now to complete the architecture
    return {
      message: 'Résultats de la recherche sémantique',
      results: [
        { page: 12, excerpt: `...conformément aux termes du contrat concernant ${q}...` },
        { page: 45, excerpt: `...montant total de la transaction liée à ${q} s'élève à...` }
      ]
    };
  }

  // Écouteur RabbitMQ pour le retour de FastAPI (IA)
  @EventPattern('scanner.document.traite')
  async handleDocumentProcessed(@Payload() data: any) {
    await this.scannerService.handleDocumentProcessed(data);
  }

  @Get('archives/:id/download')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(TenantInterceptor, AuditInterceptor)
  @ApiOperation({ summary: 'Télécharger/consulter une archive GED par ID' })
  async downloadArchive(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.scannerService.getArchiveUrl(tenantId, id);
  }
}
