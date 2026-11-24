import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

// Protege as rotas INTERNAS (chamadas só por outros microsserviços, nunca pelo front).
// Quem chama manda o cabeçalho "x-service-key" com o segredo compartilhado (SERVICE_KEY).
@Injectable()
export class ServiceKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(contexto: ExecutionContext): boolean {
    const esperada = this.config.get<string>('SERVICE_KEY');
    const recebida = contexto.switchToHttp().getRequest<Request>().headers['x-service-key'];

    // Sem SERVICE_KEY configurada a rota fica FECHADA (nunca aberta por esquecimento).
    if (!esperada || typeof recebida !== 'string') {
      throw new UnauthorizedException('Chave de serviço inválida.');
    }
    const a = Buffer.from(recebida);
    const b = Buffer.from(esperada);
    // Comparação em tempo constante, para não vazar a chave pelo tempo de resposta.
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Chave de serviço inválida.');
    }
    return true;
  }
}