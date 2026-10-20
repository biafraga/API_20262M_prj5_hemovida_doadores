import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Perfil, UsuarioAutenticado } from '../auth/tipos/usuario-autenticado';
import { PaginacaoQueryDto } from '../common/dto/paginacao-query.dto';
import { CreateDoadorDto } from './dto/create-doador.dto';
import { UpdateDoadorDto } from './dto/update-doador.dto';
import { PERFIS_CONSULTA, PERFIS_GESTAO } from './doadores.perfis';
import { ehDataReal, paraDataUtc } from '../common/helpers/data';
import { calcularIdade } from '../common/helpers/idade';

// doador_status é um INT no banco. Nossa convenção:
const STATUS_ATIVO = 1;
const STATUS_INATIVO = 0;
 
// RN01: só doa quem tem de 18 a 69 anos.
const IDADE_MINIMA = 18;
const IDADE_MAXIMA = 69;
 
@Injectable()
export class DoadoresService {
  constructor(private readonly prisma: PrismaService) {}
 
  // GET /doadores?page=1&limit=10 - lista só os doadores ativos, de forma paginada
  async listar({ page, limit }: PaginacaoQueryDto) {
    const where = { doador_status: STATUS_ATIVO };
 
    const [total, data] = await Promise.all([
      this.prisma.doador.count({ where }),
      this.prisma.doador.findMany({
        where,
        orderBy: { doador_id: 'asc' },
        skip: (page - 1) * limit, // quantos registros pular
        take: limit, // quantos trazer
      }),
    ]);
 
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
 
  // GET /doadores/:id - a equipe vê qualquer um; o doador só vê o próprio cadastro
  async buscarPorId(id: number, solicitante: UsuarioAutenticado) {
    const doador = await this.buscarAtivoOuFalhar(id);
    this.garantirAcesso(doador.usuario_id, solicitante, PERFIS_CONSULTA);
    return doador;
  }
 
  // GET /doadores/cpf/:cpf - só a equipe (o @Roles do controller já barra os demais)
  async buscarPorCpf(cpf: string) {
    const doador = await this.prisma.doador.findFirst({
      where: { doador_cpf: cpf, doador_status: STATUS_ATIVO },
    });
    if (!doador) throw new NotFoundException(`Doador com o CPF ${cpf} não encontrado.`);
    return doador;
  }
 
  // POST /doadores
  async criar(dto: CreateDoadorDto, solicitante: UsuarioAutenticado) {
    // Um doador só pode cadastrar o PRÓPRIO perfil. A equipe cadastra qualquer um.
    if (solicitante.role === Perfil.DOADOR && dto.usuario_id !== solicitante.sub) {
      throw new ForbiddenException('Você só pode cadastrar o seu próprio perfil de doador');
    }
 
    const nascimento = this.validarIdade(dto.doador_data_nascimento);
 
    return this.prisma.doador.create({
      data: {
        usuario_id: dto.usuario_id,
        doador_nome: dto.doador_nome,
        doador_cpf: dto.doador_cpf,
        doador_data_nascimento: nascimento,
        doador_genero: dto.doador_genero,
        doador_tipo_sanguineo: dto.doador_tipo_sanguineo,
        // No banco o valor é '+' ou '-'; no Prisma os nomes são POSITIVO e NEGATIVO.
        doador_fator_rh: dto.doador_fator_rh === '+' ? 'POSITIVO' : 'NEGATIVO',
        doador_telefone: dto.doador_telefone,
        doador_email: dto.doador_email,
        doador_cep: dto.doador_cep,
        doador_endereco: dto.doador_endereco,
        doador_status: STATUS_ATIVO,
      },
    });
  }
 
  // PUT /doadores/:id - atualiza dados cadastrais (a gestão altera qualquer um; o doador, o próprio)
  async atualizar(id: number, dto: UpdateDoadorDto, solicitante: UsuarioAutenticado) {
    const doador = await this.buscarAtivoOuFalhar(id); // 404 antes de qualquer outra coisa
    this.garantirAcesso(doador.usuario_id, solicitante, PERFIS_GESTAO);
 
    return this.prisma.doador.update({
      where: { doador_id: id },
      data: dto,
    });
  }
 
  // DELETE /doadores/:id - soft delete: o registro continua no banco, só fica inativo
  async remover(id: number) {
    await this.buscarAtivoOuFalhar(id);
    await this.prisma.doador.update({
      where: { doador_id: id },
      data: { doador_status: STATUS_INATIVO },
    });
    return { mensagem: `Doador ${id} inativado com sucesso.` };
  }
 
  // Busca um doador ativo ou lança 404. Uso interno: não checa permissão.
  private async buscarAtivoOuFalhar(id: number) {
    const doador = await this.prisma.doador.findFirst({
      where: { doador_id: id, doador_status: STATUS_ATIVO },
    });
    if (!doador) throw new NotFoundException(`Doador ${id} não encontrado.`);
    return doador;
  }
 
  // Regra de acesso por REGISTRO: perfis liberados passam; os demais só se forem o dono.
  // (As regras por PERFIL ficam no controller, com @Roles. Esta aqui precisa do registro.)
  private garantirAcesso(
    usuarioIdDoDoador: number,
    solicitante: UsuarioAutenticado,
    perfisComAcessoTotal: Perfil[],
  ): void {
    if (perfisComAcessoTotal.includes(solicitante.role)) return;
    if (usuarioIdDoDoador === solicitante.sub) return;
    throw new ForbiddenException('Você só pode acessar os seus próprios dados');
  }
 
  // Confere que a data existe de verdade e aplica a RN01. Devolve a data pronta para o banco.
  private validarIdade(dataNascimento: string): Date {
    if (!ehDataReal(dataNascimento)) {
      throw new BadRequestException('doador_data_nascimento não é uma data real.');
    }
 
    const nascimento = paraDataUtc(dataNascimento) as Date;
    const idade = calcularIdade(nascimento);
 
    if (idade < IDADE_MINIMA || idade > IDADE_MAXIMA) {
      throw new BadRequestException(
        `Doador fora da faixa etária permitida (${IDADE_MINIMA} a ${IDADE_MAXIMA} anos).`,
      );
    }
    return nascimento;
  }
}