import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Authentification par jeton Keycloak, sans exception.
 *
 * Un ancien contournement acceptait `Authorization: Bearer test-token` et
 * ouvrait une session factice sur l'entreprise de démonstration. Active quel que
 * soit NODE_ENV, il suffisait donc à connaître cette chaîne pour lire les
 * documents, factures et journaux de n'importe quel client. Il est
 * supprimé : un jeton réel est désormais exigé partout, y compris en
 * développement, où il est obtenu par le même échange de mots de passe.
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
