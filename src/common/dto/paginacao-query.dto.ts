import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Parâmetros de paginação lidos da URL: GET /doadores?page=2&limit=10
export class PaginacaoQueryDto {
  // Tudo na URL chega como texto. O @Type converte para número antes de validar.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}