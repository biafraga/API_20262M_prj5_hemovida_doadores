import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ServiceKeyGuard } from '../auth/guards/service-key.guard';
import { DoadoresService } from './doadores.service';
import { ValidarLoginDto } from './dto/validar-login.dto';

// Rota INTERNA: só o MS4 chama, com x-service-key. O @Public() apenas desliga o JWT;
// quem protege aqui é o ServiceKeyGuard. O gateway NÃO deve expor o prefixo /internal.
@Public()
@UseGuards(ServiceKeyGuard)
@Controller('internal/doadores')
export class DoadoresInternalController {
  constructor(private readonly doadoresService: DoadoresService) {}

  @Post('validar-login')
  @HttpCode(200)
  validarLogin(@Body() dto: ValidarLoginDto) {
    return this.doadoresService.validarLogin(dto.cpf, dto.dataNascimento);
  }
}