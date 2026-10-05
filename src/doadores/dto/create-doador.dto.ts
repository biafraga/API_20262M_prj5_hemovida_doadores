import { IsEmail, IsNotEmpty, IsString, MaxLength, IsInt, IsIn } from 'class-validator';
import { EhLatin1 } from '../../common/validators/eh-latin1.validator';

export class CreateDoadorDto {
  @IsInt()
  @IsNotEmpty({ message: 'O ID do usuário vinculado é obrigatório' })
  usuario_id!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @EhLatin1()
  doador_nome!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(11)
  doador_cpf!: string;

  @IsString()
  @IsNotEmpty()
  doador_data_nascimento!: string;

  @IsIn(['Feminino', 'Masculino', 'Outros'])
  @IsNotEmpty()
  doador_genero!: string;

  @IsIn(['A', 'B', 'AB', 'O'])
  @IsNotEmpty()
  doador_tipo_sanguineo!: string;

  @IsIn(['+', '-'])
  @IsNotEmpty()
  doador_fator_rh!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  doador_telefone!: string;

  @IsEmail({}, { message: 'email deve ser um endereço válido' })
  @MaxLength(255)
  doador_email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  doador_cep!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @EhLatin1()
  doador_endereco!: string;

  @IsInt()
  @IsNotEmpty()
  doador_status!: number;
}