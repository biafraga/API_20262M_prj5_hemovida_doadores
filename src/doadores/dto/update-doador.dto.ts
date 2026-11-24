import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateDoadorDto } from './create-doador.dto';

// Dados que podem ser corrigidos. CPF, nascimento, status e usuario_id ficam de fora de
// propósito: com `forbidNonWhitelisted`, quem tentar alterar esses campos recebe 400.
// Tipo sanguíneo e fator RH entram aqui, mas só ADMIN e RECEPCAO podem alterá-los
// (o service devolve 403 se o próprio doador tentar).
export class UpdateDoadorDto extends PartialType(
  PickType(CreateDoadorDto, [
    'doador_genero',
    'doador_telefone',
    'doador_email',
    'doador_cep',
    'doador_endereco',
    'doador_tipo_sanguineo',
    'doador_fator_rh',
  ] as const),
) {}