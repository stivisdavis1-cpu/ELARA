import { Module } from '@nestjs/common';
import { ScannerController } from './scanner.controller.js';
import { MinioService } from './minio.service.js';
import { ScannerGateway } from './scanner.gateway.js';
import { ScannerService } from './scanner.service.js';
import { PrismaService } from '../prisma.service.js';
import { OcrService } from './ocr.service.js';
import { SearchService } from './search.service.js';

@Module({
  controllers: [ScannerController],
  providers: [ScannerService, MinioService, ScannerGateway, PrismaService, OcrService, SearchService]
})
export class ScannerModule {}
