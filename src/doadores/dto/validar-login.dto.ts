import { Matches } from 'class-validator';

// Corpo que o MS4 envia ao MS1 para conferir o login do doador.
export class ValidarLoginDto {
  @Matches(/^\d{11}$/, { message: 'cpf deve ter exatamente 11 dígitos, sem pontos ou traço' })
  cpf!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dataNascimento deve estar no formato AAAA-MM-DD' })
  dataNascimento!: string;
}