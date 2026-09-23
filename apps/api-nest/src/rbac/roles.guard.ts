import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // L'IA n'a jamais de droit d'écriture (POST, PUT, PATCH, DELETE)
    const method = request.method;
    if (user.roles?.includes('assistant_ia_systeme') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      throw new ForbiddenException('Le rôle IA Système ne peut pas effectuer d\'action d\'écriture');
    }

    if (!requiredRoles) {
      return true; // Pas de rôles requis, accès libre aux rôles authentifiés
    }

    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('Droits insuffisants pour cette ressource');
    }

    return true;
  }
}
