import { Controller, Get, Logger, Query, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { Ms4Client } from '../ms4/ms4.client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ms4: Ms4Client,
  ) {}

  // GET /health            -> só confere o banco (rápido, usado por monitoramento).
  // GET /health?integracao=1 -> confere também a ligação com o MS4 (diagnóstico).
  @Public() // o health check precisa responder sem token
  @Get()
  async verificar(@Query('integracao') integracao?: string) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (erro) {
      this.logger.error(`Banco inacessivel: ${erro}`);
      throw new ServiceUnavailableException({
        status: 'erro',
        database: 'down',
      });
    }

    return {
      status: 'ok',
      database: 'up',
      // Só aparece com ?integracao=1. A falha do MS4 não derruba o health: o MS1 em si está de pé.
      ...(integracao === '1' && { ms4: await this.ms4.verificarConexao() }),
      timestamp: new Date().toISOString(),
    };
  }
}