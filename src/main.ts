import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurarApp } from './app.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

configurarApp(app);

  const config = app.get(ConfigService);
  const porta = config.get<number>('PORT', 3000);

  await app.listen(porta);
  Logger.log(`API no ar em http://localhost:${porta}`, 'Bootstrap');
}
void bootstrap();