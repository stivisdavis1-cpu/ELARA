import { Module } from '@nestjs/common';
import { UtilisateursController } from './utilisateurs.controller.js';
import { MesOrganisationsController } from './mes-organisations.controller.js';
import { InscriptionController } from './inscription.controller.js';
import { ActivationController } from './activation.controller.js';
import { UtilisateursService } from './utilisateurs.service.js';

@Module({
  controllers: [
    UtilisateursController,
    MesOrganisationsController,
    InscriptionController,
    ActivationController,
  ],
  providers: [UtilisateursService],
  exports: [UtilisateursService],
})
export class UtilisateursModule {}
