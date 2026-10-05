import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DoadoresService } from './doadores.service';
import { CreateDoadorDto } from './dto/create-doador.dto';

@Controller('doadores')
export class DoadoresController {
  // injeção do service que construimos
  constructor(private readonly doadoresService: DoadoresService) {}

  // GET http://localhost:3000/doadores
  @Get()
  listar() {
    return this.doadoresService.listar();
  }

  // GET http://localhost:3000/doadores/cpf/12345678901
  @Get('cpf/:cpf')
  buscarPorCpf(@Param('cpf') cpf: string) {
    return this.doadoresService.buscarPorCpf(cpf);
  }

  // POST http://localhost:3000/doadores
  @Post()
  criar(@Body() dto: CreateDoadorDto) {
    return this.doadoresService.criar(dto);
  }
}