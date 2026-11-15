import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurarApp } from './app.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

configurarApp(app);

  const config = app.get(ConfigService);
  const porta = config.get<number>('PORT', 7502);

  // Libera o front-end. Sem a variável CORS_ORIGIN, o CORS fica desligado.
  const origemFront = config.get<string>('CORS_ORIGIN');
  if (origemFront) {
    app.enableCors({ origin: origemFront.split(',') });
  }

  await app.listen(porta);
  Logger.log(`API no ar em http://localhost:${porta}`, 'Bootstrap');
}
void bootstrap();