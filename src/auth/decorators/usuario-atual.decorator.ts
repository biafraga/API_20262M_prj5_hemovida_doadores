import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UsuarioAutenticado } from '../tipos/usuario-autenticado';

// Entrega, direto no parâmetro do método, o usuário que veio do token.
export const UsuarioAtual = createParamDecorator(
  (_dados: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    return contexto.switchToHttp().getRequest<{ user: UsuarioAutenticado }>().user;
  },
);