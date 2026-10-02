import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UtilisateursService } from './utilisateurs.service.js';

/**
 * Inscription autonome.
 *
 * Point d'entrée public, ce qui est normal pour une création de compte mais
 * impose des règles : le client ne choisit ni son rôle, ni son entreprise, ni
 * son identifiant ; il ne fournit qu'une identité et une entreprise à créer.
 * Chaque appel reste limité à une seule création.
 */
@ApiTags('Inscription')
@Controller('v1/inscription')
export class InscriptionController {
  constructor(private readonly utilisateurs: UtilisateursService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Créer un compte et sa première entreprise' })
  inscrire(@Body() data: any) {
    return this.utilisateurs.inscrire(data);
  }
}
