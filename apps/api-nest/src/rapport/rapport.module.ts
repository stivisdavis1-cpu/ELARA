import { Module } from '@nestjs/common';
import { RapportController } from './rapport.controller.js';

@Module({
  controllers: [RapportController]
})
export class RapportModule {}
