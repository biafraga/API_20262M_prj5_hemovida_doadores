import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHAVE_ROLES } from '../decorators/roles.decorator';
import type { Perfil, UsuarioAutenticado } from '../tipos/usuario-autenticado';

// Roda DEPOIS do JwtAuthGuard (que preenche request.user).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const perfisExigidos = this.reflector.getAllAndOverride<Perfil[]>(CHAVE_ROLES, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    // Rota sem @Roles: qualquer usuário autenticado passa por aqui.
    if (!perfisExigidos?.length) return true;

    const usuario = contexto
      .switchToHttp()
      .getRequest<{ user?: UsuarioAutenticado }>().user;

    if (!usuario || !perfisExigidos.includes(usuario.role)) {
      throw new ForbiddenException('Seu perfil não tem permissão para esta operação');
    }
    return true;
  }
}