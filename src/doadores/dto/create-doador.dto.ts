import { IsEmail, IsIn, IsInt, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import type { doador_doador_genero, doador_doador_tipo_sanguineo } from '../../generated/prisma/enums';
import { EhLatin1 } from '../../common/validators/eh-latin1.validator';

// Quem decide se o doador está ativo é o sistema (service), não o cliente.
export class CreateDoadorDto {
  @IsInt()
  @IsNotEmpty({ message: 'O ID do usuário vinculado é obrigatório' })
  usuario_id!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @EhLatin1()
  doador_nome!: string;

  @Matches(/^\d{11}$/, { message: 'doador_cpf deve ter exatamente 11 dígitos, sem pontos ou traço' })
  doador_cpf!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'doador_data_nascimento deve estar no formato AAAA-MM-DD' })
  doador_data_nascimento!: string;

  @IsIn(['Feminino', 'Masculino', 'Outros'])
  doador_genero!: doador_doador_genero;

  @IsIn(['A', 'B', 'AB', 'O'])
  doador_tipo_sanguineo!: doador_doador_tipo_sanguineo;

  @IsIn(['+', '-'])
  doador_fator_rh!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  doador_telefone!: string;

  @IsEmail({}, { message: 'email deve ser um endereço válido' })
  @MaxLength(255)
  doador_email!: string;

  @Matches(/^\d{8}$/, { message: 'doador_cep deve ter exatamente 8 dígitos, sem hífen' })
  doador_cep!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @EhLatin1()
  doador_endereco!: string;
}