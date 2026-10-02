import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UtilisateursService } from './utilisateurs.service.js';

/**
 * Organisations accessibles au compte connecté.
 *
 * Volontairement **sans** `TenantInterceptor` : l'intercepteur vérifie
 * l'appartenance à un tenant demandé, or c'est justement ce qu'on ignore ici.
 * Un compte nouvellement provisionné doit pouvoir lister ce à quoi il a accès
 * — sinon il ne dispose d'aucun moyen de retrouver son espace.
 *
 * L'identité vient du jeton (`sub` Keycloak), jamais d'un en-tête : c'est le
 * seul identifiant que l'appelant ne contrôle pas.
 */
@ApiTags('Utilisateurs & rôles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/mes-organisations')
export class MesOrganisationsController {
  constructor(private readonly utilisateurs: UtilisateursService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les entreprises accessibles au compte connecté' })
  lister(@Req() req: any) {
    return this.utilisateurs.mesOrganisations(String(req.user?.userId ?? ''));
  }

  @Post()
  @ApiOperation({ summary: 'Créer une entreprise et y rattacher le compte connecté' })
  creer(@Req() req: any, @Body() data: any) {
    // L'identité de l'appelant vient du jeton : un compte qui s'authentifie puis
    // crée son entreprise n'a pas à ressaisir une adresse et un nom que Keycloak
    // connaît déjà. Le corps de la requête ne sert qu'à l'identité légale.
    return this.utilisateurs.creerOrganisation(String(req.user?.userId ?? ''), data, {
      email: req.user?.email,
      nom: [req.user?.givenName, req.user?.familyName].filter(Boolean).join(' ').trim() || undefined,
    });
  }
}
