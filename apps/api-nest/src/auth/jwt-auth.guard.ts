import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Authentification par jeton Keycloak, sans exception.
 *
 * Un ancien contournement d'authentification a été supprimé. Un jeton réel est
 * désormais exigé partout, y compris en développement (obtenu par échange de
 * mots de passe standard). Aucun repli n'est autorisé.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, _context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Token invalide ou manquant');
    }
    return user;
  }
}
