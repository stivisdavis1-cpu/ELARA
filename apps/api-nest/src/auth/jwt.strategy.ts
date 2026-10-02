import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: process.env.KEYCLOAK_JWKS_URI || 'http://localhost:8080/realms/elara/protocol/openid-connect/certs',
      }),
      issuer: process.env.KEYCLOAK_ISSUER || 'http://localhost:8080/realms/elara',
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
    // Cette méthode est appelée si la signature du token est valide.
    // L'objet renvoyé sera attaché à 'req.user' par Passport.
    //
    // Le tenant n'est volontairement PAS résolu ici : un même utilisateur
    // peut être rattaché à plusieurs organisations via `user_tenants`, seul
    // TenantInterceptor sait dire laquelle est demandée (et il vérifie
    // l'accès). Les contrôleurs lisent donc `@TenantId()`, pas `req.user.tenantId`.
      return {
        userId: payload.sub,
        username: payload.preferred_username,
        roles: this.normaliserRoles(payload),
        email: payload.email,
        givenName: payload.given_name,
        familyName: payload.family_name,
      };
  }

  /**
   * Aplatit les rôles Keycloak en une liste de chaînes : `realm_access.roles`
   * porte les rôles globaux, `resource_access` les rôles applicatifs.
   */
  private normaliserRoles(payload: any): string[] {
    const realm = payload?.realm_access?.roles;
    const ressources = Object.values<any>(payload?.resource_access ?? {})
      .flatMap((r: any) => (Array.isArray(r?.roles) ? r.roles : []));
    return [...new Set([...(Array.isArray(realm) ? realm : []), ...ressources])].filter(
      (r): r is string => typeof r === 'string',
    );
  }
}
