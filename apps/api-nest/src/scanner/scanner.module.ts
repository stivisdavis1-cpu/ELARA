import { Module } from '@nestjs/common';
import { ScannerController } from './scanner.controller.js';
import { ScannerGateway } from './scanner.gateway.js';
import { ScannerService } from './scanner.service.js';
import { ExportService } from './export.service.js';
import { PrismaService } from '../prisma.service.js';
import { OcrService } from './ocr.service.js';
import { SearchService } from './search.service.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  // MinioService vient de StorageModule (global) : le déclarer ici
  // créerait une seconde instance avec son propre client objet.
  imports: [StorageModule],
  controllers: [ScannerController],
  providers: [ScannerService, ScannerGateway, PrismaService, OcrService, SearchService, ExportService],
  exports: [ExportService, ScannerService],
})
export class ScannerModule {}
