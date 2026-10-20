import { CanActivate, ExecutionContext, Injectable, UnauthorizedException,} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { CHAVE_PUBLICA } from '../decorators/public.decorator';
import { PERFIS_VALIDOS, UsuarioAutenticado } from '../tipos/usuario-autenticado';

// só CONFERE tokens, quem emite o token é o MS de usuário,
// e os dois compartilham o mesmo JWT_SECRET.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const ehPublica = this.reflector.getAllAndOverride<boolean>(CHAVE_PUBLICA, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (ehPublica) return true;

    const requisicao = contexto
      .switchToHttp()
      .getRequest<Request & { user?: UsuarioAutenticado }>();
    const token = this.extrairToken(requisicao);

    if (!token) {
      throw new UnauthorizedException(
        'Token não informado. Use o cabeçalho Authorization: Bearer <token>',
      );
    }

    try {
      const payload = await this.jwt.verifyAsync<UsuarioAutenticado>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        algorithms: ['HS256'], // só aceitamos o algoritmo que esperamos
      });

      // Assinatura válida não basta: o conteúdo também precisa fazer sentido.
      if (!Number.isInteger(payload.sub) || !PERFIS_VALIDOS.includes(payload.role)) {
        throw new Error('conteúdo do token inválido');
      }

      requisicao.user = { sub: payload.sub, role: payload.role };
    } catch {
      // Mensagem genérica de propósito: não revelamos se expirou ou se a assinatura é falsa.
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    return true;
  }

  private extrairToken(requisicao: Request): string | undefined {
    const cabecalho = requisicao.headers.authorization;
    if (!cabecalho) return undefined;
    const [tipo, token] = cabecalho.split(' ');
    return tipo === 'Bearer' ? token : undefined;
  }
}