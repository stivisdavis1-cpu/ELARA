import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { DemandeDemoDto, InscriptionListeAttenteDto } from './marketing.dto.js';
import { MarketingService } from './marketing.service.js';

/**
 * Points d'entrée marketing du pré-lancement.
 *
 * Publics (aucun garde d'authentification, aucun tenant : le visiteur n'a ni
 * compte ni entreprise). Le trafic est borné par `@Throttle` — attention, le
 * TTL est en millisecondes depuis Throttler v6 : `ttl: 60_000` = une minute —
 * doublé du pot de miel et de l'adresse unique en base.
 */
@ApiTags('Marketing')
@Controller('v1/marketing')
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}

  @Post('liste-attente')
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Inscrire un visiteur à la liste d’attente' })
  inscrire(@Body() dto: InscriptionListeAttenteDto) {
    return this.marketing.inscrireListeAttente(dto);
  }

  @Get('liste-attente/:code')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Relire la position réelle liée à un code de parrainage' })
  @ApiParam({ name: 'code', description: 'Code de parrainage (ex. XH3K9P)' })
  restaurer(@Param('code') code: string) {
    return this.marketing.restaurerPosition(code);
  }

  @Post('demandes-demo')
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Enregistrer une demande de démonstration' })
  demanderDemo(@Body() dto: DemandeDemoDto) {
    return this.marketing.demanderDemo(dto);
  }
}