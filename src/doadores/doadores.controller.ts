import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { DoadoresService } from './doadores.service';
import { CreateDoadorDto } from './dto/create-doador.dto';
import { UpdateDoadorDto } from './dto/update-doador.dto';

@Controller('doadores')
export class DoadoresController {
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

  // GET http://localhost:3000/doadores/1
  // ParseIntPipe: o :id chega como texto na URL; aqui vira número (ou 400 se não for).
  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.doadoresService.buscarPorId(id);
  }

  // POST http://localhost:3000/doadores
  @Post()
  criar(@Body() dto: CreateDoadorDto) {
    return this.doadoresService.criar(dto);
  }

  // PUT http://localhost:3000/doadores/1
  @Put(':id')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDoadorDto) {
    return this.doadoresService.atualizar(id, dto);
  }

  // DELETE http://localhost:3000/doadores/1
  @Delete(':id')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.doadoresService.remover(id);
  }
}