import { Module, Global } from '@nestjs/common';
import { MemoireController } from './memoire.controller.js';
import { BusinessMemoryService } from './memoire.service.js';
import { PrismaService } from '../prisma.service.js';

@Global()
@Module({
  controllers: [MemoireController],
  providers: [BusinessMemoryService, PrismaService],
  exports: [BusinessMemoryService]
})
export class MemoireModule {}
