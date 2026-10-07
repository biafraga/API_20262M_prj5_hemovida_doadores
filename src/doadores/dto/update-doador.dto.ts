import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateDoadorDto } from './create-doador.dto';

// Só os dados cadastrais que a Recepção (ou o próprio doador) pode corrigir.
// CPF, nascimento, tipo sanguíneo, status e usuario_id ficam de fora de propósito:
// com `forbidNonWhitelisted`, quem tentar alterar esses campos recebe 400.
export class UpdateDoadorDto extends PartialType(
  PickType(CreateDoadorDto, [
    'doador_genero',
    'doador_telefone',
    'doador_email',
    'doador_cep',
    'doador_endereco',
  ] as const),
) {}