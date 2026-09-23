import { Module, Global } from '@nestjs/common';
import { CfoController } from './cfo.controller.js';
import { CfoService } from './cfo.service.js';
import { PrismaService } from '../prisma.service.js';
import { TaxAgentService } from './tax-agent.service.js';

@Global()
@Module({
  controllers: [CfoController],
  providers: [CfoService, PrismaService, TaxAgentService],
  exports: [CfoService, TaxAgentService],
})
export class CfoModule {}
