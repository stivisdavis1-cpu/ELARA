import { Controller, Post, Get, Param, UseGuards, UseInterceptors, UploadedFile, UploadedFiles, Req, Res, StreamableFile } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantInterceptor } from '../tenant/tenant.interceptor.js';
import { AuditInterceptor } from '../audit/audit.interceptor.js';
import { ScannerService } from './scanner.service.js';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service.js';
import { SearchService } from './search.service.js';

// Script Python de conversion DOCX -> PDF, configurable via OCR_SCRIPTS_DIR
function docxToPdfScript(): string {
  const configured = process.env.OCR_SCRIPTS_DIR;
  if (configured) return resolve(configured, 'docx_to_pdf.py');
  const local = resolve(process.cwd(), 'src/scanner/docx_to_pdf.py');
  return local;
}

@ApiTags('Scanner')
@ApiBearerAuth()
@Controller('v1/scanner')
export class ScannerController {
  constructor(
    private readonly scannerService: ScannerService,
    private readonly rabbitmqService: RabbitMQService,
    private readonly searchService: SearchService
  ) {}

  @Post('documents')
  // @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './tmp',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
      }
    })
  }))
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
    if (!file) {
      return { error: 'Aucun fichier reçu par le serveur (problème Multer/FormData)' };
    }
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.originalname.endsWith('.docx') || file.mimetype.includes('word')) {
       const { execSync } = await import('child_process');
       const fs = await import('fs');
       const outputPdfPath = file.path + '.pdf';
       const scriptPath = docxToPdfScript();
       const absInput = resolve(process.cwd(), file.path);
       const absOutput = resolve(process.cwd(), outputPdfPath);
       try {
           execSync(`python "${scriptPath}" "${absInput}" "${absOutput}"`);
           file.path = outputPdfPath;
           file.mimetype = 'application/pdf';
           file.originalname = file.originalname.replace(/\.docx?$/i, '.pdf');
           file.buffer = fs.readFileSync(outputPdfPath);
       } catch (e) {
           console.error("Erreur de conversion DOCX vers PDF", e);
       }
    }

    const tenantId = req.user?.tenantId || 'test-tenant'; // injecté par JwtAuthGuard
    return this.scannerService.processNewDocument(tenantId, file);
  }

  @Post('documents-async')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './tmp',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
      }
    })
  }))
  @ApiOperation({ summary: 'Importer un nouveau document pour extraction IA (Asynchrone via RabbitMQ)' })
  @ApiConsumes('multipart/form-data')
  async uploadDocumentAsync(@UploadedFile() file: any, @Req() req: any) {
    const tenantId = req.user?.tenantId || 'test-tenant';
    const documentId = `doc-${Date.now()}`;
    const fileUrl = file.path; // In a real scenario, this would be a MinIO URL

    try {
      await this.rabbitmqService.publishDocumentTask(documentId, fileUrl, file.mimetype, tenantId);
      return {
        message: "Document reçu et mis en file d'attente pour analyse IA.",
        document_id: documentId,
        status: "PROCESSING"
      };
    } catch (e: any) {
      return { error: "Erreur de publication RabbitMQ", details: e.message };
    }
  }

  @Post('documents/bulk')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(TenantInterceptor, AuditInterceptor, FilesInterceptor('files', 1000, {
    storage: diskStorage({
      destination: './tmp',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
      }
    })
  }))
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
    
    const { execSync } = await import('child_process');
    const fs = await import('fs');
    const scriptPath = docxToPdfScript();

    for (const file of files) {
       if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.originalname.endsWith('.docx') || file.mimetype.includes('word')) {
          const outputPdfPath = file.path + '.pdf';
          const absInput = resolve(process.cwd(), file.path);
          const absOutput = resolve(process.cwd(), outputPdfPath);
          try {
              execSync(`python "${scriptPath}" "${absInput}" "${absOutput}"`);
              file.path = outputPdfPath;
              file.mimetype = 'application/pdf';
              file.originalname = file.originalname.replace(/\.docx?$/i, '.pdf');
              file.buffer = fs.readFileSync(outputPdfPath);
          } catch (e) {
              console.error("Erreur de conversion DOCX vers PDF bulk", e);
          }
       }
    }

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

  @Get('documents')
  @ApiOperation({ summary: 'Lister les documents récents du tenant (source de vérité BDD + archives)' })
  async listDocuments(@Req() req: any) {
    const tenantId = req.user?.tenantId || 'test-tenant';
    return this.scannerService.listDocuments(tenantId);
  }

  @Get('documents/:id/file')
  @ApiOperation({ summary: 'Streaming du fichier d\'un document (fichier de travail ou copie d\'archive diskgroup)' })
  async getDocumentFile(@Param('id') id: string, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const tenantId = req.user?.tenantId || 'test-tenant';
    const { buffer, type_document } = await this.scannerService.downloadDocumentFile(tenantId, id);
    res.set({
      'Content-Type': type_document,
      'Content-Disposition': `inline; filename="${id}"`,
      'Cache-Control': 'private, max-age=300',
    });
    return new StreamableFile(buffer);
  }

  @Post('documents/preview')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Convertir la première page d\'un document en image pour OCR Zonal' })
  @ApiConsumes('multipart/form-data')
  async getDocumentPreview(@UploadedFile() file: any) {
    if (file.mimetype.startsWith('image/')) {
      return {
        imageBase64: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
      };
    }
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
    const tenantId = req.user?.tenantId || 'test-tenant';
    
    if (!q) {
      return { message: 'Veuillez fournir un paramètre de recherche q', results: [] };
    }

    try {
      const results = await this.searchService.hybridSearch(tenantId, q);
      return {
        message: 'Résultats de la recherche sémantique',
        results
      };
    } catch (error: any) {
      return {
        error: 'Erreur lors de la recherche sémantique',
        details: error.message
      };
    }
  }

  // Écouteur RabbitMQ pour le retour de FastAPI (IA)
  @EventPattern('scanner.document.traite')
  async handleDocumentProcessed(@Payload() data: any) {
    await this.scannerService.handleDocumentProcessed(data);
  }

  @EventPattern('scanner.document.progress')
  async handleDocumentProgress(@Payload() data: any) {
    this.scannerService.handleDocumentProgress(data.tenant_id, data.document_id, data.progress, data.message);
  }

  @Get('archives/:id/download')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(TenantInterceptor, AuditInterceptor)
  @ApiOperation({ summary: 'Télécharger/consulter une archive GED par ID' })
  async downloadArchive(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.scannerService.getArchiveUrl(tenantId, id);
  }

  @Get('archives')
  @ApiOperation({ summary: 'Index logique des documents archivés (stockage en mémoire + BDD)' })
  async listArchives(@Req() req: any) {
    const tenantId = req.user?.tenantId || 'test-tenant';
    return this.scannerService.getArchiveRecords(tenantId);
  }

  @Post('documents/:id/archive')
  @ApiOperation({ summary: 'Valider & archiver un document : copie dans le diskgroup sécurisé + index logique' })
  @ApiBearerAuth()
  async archiveDocument(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId || 'test-tenant';
    return this.scannerService.archiveDocument(tenantId, id);
  }

  @Get('archives/:id/raw')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(TenantInterceptor, AuditInterceptor)
  @ApiOperation({ summary: 'Streaming du fichier brut d\'une archive GED par ID' })
  async downloadArchiveRaw(@Req() req: any, @Param('id') id: string, @Res({ passthrough: true }) res: any) {
    const tenantId = req.user.tenantId;
    const { buffer, type_document } = await this.scannerService.downloadDocumentFile(tenantId, id);
    res.set({
      'Content-Type': type_document,
      'Content-Disposition': `inline; filename="${id}"`,
      'Cache-Control': 'private, max-age=60',
    });
    return new StreamableFile(buffer);
  }
}
