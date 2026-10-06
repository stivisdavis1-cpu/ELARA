import { Module } from '@nestjs/common';
import { MarketingController } from './marketing.controller.js';
import { MarketingService } from './marketing.service.js';
import { PrismaService } from '../prisma.service.js';

@Module({
  controllers: [MarketingController],
  providers: [MarketingService, PrismaService],
  exports: [MarketingService],
})
export class MarketingModule {}