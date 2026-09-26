import { Module } from '@nestjs/common';
import { DocgenController } from './docgen.controller.js';
import { DocgenService } from './docgen.service.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [StorageModule],
  controllers: [DocgenController],
  providers: [DocgenService],
  exports: [DocgenService],
})
export class DocgenModule {}
