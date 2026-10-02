import { BadRequestException, Body, Controller, Get, Param, Post, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UtilisateursService } from './utilisateurs.service.js';
import { ActivationDto } from './activation.dto.js';

/**
 * Activation d'un compte invité.
 *
 * Volontairement **sans** `JwtAuthGuard` : l'invité n'est pas encore connecté,
 * c'est tout l'intérêt de l'invitation. Sa légitimité vient du jeton à usage
 * unique contenu dans le lien, dont seule l'empreinte est stockée — l'API ne
 * connaît donc pas le jeton des invitations existantes et ne peut pas les
 * rejouer. L'interface publique n'expose que l'adresse invitée et le nom de
 * l'entreprise, jamais un compte ni un rôle.
 */
@ApiTags('Activation')
@Controller('v1/activation')
export class ActivationController {
  constructor(private readonly utilisateurs: UtilisateursService) {}

  @Get(':jeton')
  @ApiOperation({ summary: 'Vérifier un lien d’activation' })
  decrire(@Param('jeton') jeton: string) {
    return this.utilisateurs.decrireActivation(jeton);
  }

  @Post(':jeton')
  @ApiOperation({ summary: 'Définir son mot de passe et activer le compte' })
  activer(@Param('jeton') jeton: string, @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) data: ActivationDto) {
    // La confirmation n'est vérifiée que par l'interface aujourd'hui : un appel
    // direct à l'API posait un mot de passe sans jamais l'avoir saisi deux fois.
    // Elle est contrôlée ici pour que la règle ne dépende pas du client.
    if (data.confirmation !== data.mot_de_passe) {
      throw new BadRequestException('Les deux mots de passe ne correspondent pas.');
    }
    return this.utilisateurs.activer(jeton, data.mot_de_passe);
  }
}
