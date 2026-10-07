import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UtilisateursService } from './utilisateurs.service.js';
import { InscriptionDto } from './inscription.dto.js';

/**
 * Inscription autonome.
 *
 * Point d'entrée public, ce qui est normal pour une création de compte mais
 * impose des règles : le client ne choisit ni son rôle, ni son entreprise, ni
 * son identifiant ; il ne fournit qu'une identité et une entreprise à créer.
 * Chaque appel reste limité à une seule création.
 *
 * Durcissement : DTO fermé (tout champ inconnu ⇒ 400, pas d'élévation de
 * privilège par `role` injecté) + rate-limit strict (création de compte =
 * cible n°1 des fermes à spam et de l'énumération d'e-mails).
 */
@ApiTags('Inscription')
@Controller('v1/inscription')
export class InscriptionController {
  constructor(private readonly utilisateurs: UtilisateursService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @ApiOperation({ summary: 'Créer un compte et sa première entreprise' })
  inscrire(@Body() data: InscriptionDto) {
    return this.utilisateurs.inscrire(data);
  }
}
