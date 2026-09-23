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
    return {
      userId: payload.sub,
      username: payload.preferred_username,
      roles: payload.realm_access?.roles || [],
      email: payload.email
    };
  }
}
