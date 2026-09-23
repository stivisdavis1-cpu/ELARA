import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';
import { CfoModule } from '../cfo/cfo.module.js';
import { PrismaService } from '../prisma.service.js';

@Module({
  imports: [CfoModule],
  controllers: [AssistantController],
  providers: [AssistantService, PrismaService],
  exports: [AssistantService],
})
export class AssistantModule {}
