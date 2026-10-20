import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsuarioAtual } from '../auth/decorators/usuario-atual.decorator';
import { Perfil, UsuarioAutenticado } from '../auth/tipos/usuario-autenticado';
import { PaginacaoQueryDto } from '../common/dto/paginacao-query.dto';
import { DoadoresService } from './doadores.service';
import { PERFIS_CONSULTA, PERFIS_GESTAO } from './doadores.perfis';
import { CreateDoadorDto } from './dto/create-doador.dto';
import { UpdateDoadorDto } from './dto/update-doador.dto';

// Todas as rotas exigem token (guard global). O @Roles restringe por perfil.
@Controller('doadores')
export class DoadoresController {
  constructor(private readonly doadoresService: DoadoresService) {}
 
  // GET http://localhost:3000/doadores?page=1&limit=10
  @Roles(...PERFIS_CONSULTA)
  @Get()
  listar(@Query() paginacao: PaginacaoQueryDto) {
    return this.doadoresService.listar(paginacao);
  }
 
  // GET http://localhost:3000/doadores/cpf/12345678901
  @Roles(...PERFIS_CONSULTA)
  @Get('cpf/:cpf')
  buscarPorCpf(@Param('cpf') cpf: string) {
    return this.doadoresService.buscarPorCpf(cpf);
  }
 
  // GET http://localhost:3000/doadores/1
  // O doador também pode (só o próprio cadastro): o service confere o dono.
  @Roles(Perfil.DOADOR, ...PERFIS_CONSULTA)
  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number, @UsuarioAtual() solicitante: UsuarioAutenticado) {
    return this.doadoresService.buscarPorId(id, solicitante);
  }
 
  // POST http://localhost:3000/doadores
  @Roles(Perfil.DOADOR, ...PERFIS_GESTAO)
  @Post()
  criar(@Body() dto: CreateDoadorDto, @UsuarioAtual() solicitante: UsuarioAutenticado) {
    return this.doadoresService.criar(dto, solicitante);
  }
 
  // PUT http://localhost:3000/doadores/1
  @Roles(Perfil.DOADOR, ...PERFIS_GESTAO)
  @Put(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDoadorDto,
    @UsuarioAtual() solicitante: UsuarioAutenticado,
  ) {
    return this.doadoresService.atualizar(id, dto, solicitante);
  }
 
  // DELETE http://localhost:3000/doadores/1
  @Roles(...PERFIS_GESTAO)
  @Delete(':id')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.doadoresService.remover(id);
  }
}
 