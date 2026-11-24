import { Module } from '@nestjs/common';
import { Ms4Client } from './ms4.client';

// este arquivo é o "telefone" do MS1 para o MS4. Tem duas funções: pedir que o MS4 crie o usuário do doador e pedir que o MS4 desative esse usuário, caso o cadastro dê errado depois. Se o MS4 estiver fora do ar ou lento (mais de 5 s), o doador recebe "Cadastro indisponível no momento", em vez de a tela ficar travada.

@Module({
  providers: [Ms4Client],
  exports: [Ms4Client],
})
export class Ms4Module {}