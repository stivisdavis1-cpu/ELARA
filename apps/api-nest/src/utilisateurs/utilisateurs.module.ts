import { Module } from '@nestjs/common';
import { UtilisateursController } from './utilisateurs.controller.js';
import { UtilisateursService } from './utilisateurs.service.js';

@Module({
  controllers: [UtilisateursController],
  providers: [UtilisateursService],
  exports: [UtilisateursService],
})
export class UtilisateursModule {}
