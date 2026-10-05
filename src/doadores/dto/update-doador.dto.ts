import { PartialType } from '@nestjs/mapped-types';
import { CreateDoadorDto } from './create-doador.dto';

export class UpdateDoadoreDto extends PartialType(CreateDoadorDto) {}
