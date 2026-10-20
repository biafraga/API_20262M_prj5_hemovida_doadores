import { INestApplication, ValidationPipe } from '@nestjs/common';

// Configuração compartilhada entre a API real (main.ts) e os testes e2e.
// Assim os testes rodam com exatamente as mesmas regras da produção.
export function configurarApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}