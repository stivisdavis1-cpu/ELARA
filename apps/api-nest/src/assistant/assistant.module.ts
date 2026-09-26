import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';
import { CfoModule } from '../cfo/cfo.module.js';
import { PrismaService } from '../prisma.service.js';
import { SearchService } from '../scanner/search.service.js';

@Module({
  imports: [CfoModule],
  controllers: [AssistantController],
  providers: [AssistantService, SearchService, PrismaService],
  exports: [AssistantService, SearchService],
})
export class AssistantModule {}
