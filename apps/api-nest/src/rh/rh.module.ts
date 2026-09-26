import { Module } from '@nestjs/common';
import { RhController } from './rh.controller.js';
import { RhService } from './rh.service.js';

@Module({
  controllers: [RhController],
  providers: [RhService],
  exports: [RhService],
})
export class RhModule {}
