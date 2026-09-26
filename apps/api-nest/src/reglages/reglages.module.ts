import { Module } from '@nestjs/common';
import { ReglagesController } from './reglages.controller.js';
import { ReglagesService } from './reglages.service.js';

@Module({
  controllers: [ReglagesController],
  providers: [ReglagesService],
  exports: [ReglagesService],
})
export class ReglagesModule {}
