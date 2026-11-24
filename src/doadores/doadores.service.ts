import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Perfil, UsuarioAutenticado } from '../auth/tipos/usuario-autenticado';
import { PaginacaoQueryDto } from '../common/dto/paginacao-query.dto';
import { CreateDoadorDto } from './dto/create-doador.dto';
import { UpdateDoadorDto } from './dto/update-doador.dto';
import { PERFIS_CONSULTA, PERFIS_GESTAO } from './doadores.perfis';
import { ehDataReal, paraDataUtc } from '../common/helpers/data';
import { calcularIdade } from '../common/helpers/idade';
import { Ms4Client } from '../ms4/ms4.client';

// doador_status é um INT no banco. Nossa convenção:
const STATUS_ATIVO = 1;
const STATUS_INATIVO = 0;
 
// RN01: só doa quem tem de 18 a 69 anos.
const IDADE_MINIMA = 18;
const IDADE_MAXIMA = 69;
 
@Injectable()
export class DoadoresService {
 constructor(
    private readonly prisma: PrismaService,
    private readonly ms4: Ms4Client,
  ) {}
 
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

  // GET /doadores/me - o doador logado vê o próprio cadastro (usuario_id = sub do token)
  async buscarPorUsuarioId(usuarioId: number) {
    const doador = await this.prisma.doador.findFirst({
      where: { usuario_id: usuarioId, doador_status: STATUS_ATIVO },
    });
    if (!doador) throw new NotFoundException('Você ainda não tem cadastro de doador.');
    return doador;
  }
 
    // POST /doadores - cadastro público. Ordem importa: validar tudo o que é nosso ANTES de
  // criar o usuário no MS4, para só chamar o MS4 quando o cadastro tem chance de dar certo.
  // valida a idade, confere se o CPF já está cadastrado, pede ao MS4 que crie o usuário, grava o doador com o id que o MS4 devolveu, e, se a gravação falhar, pede ao MS4 que desative o usuário criado.
  async criar(dto: CreateDoadorDto) {
    const nascimento = this.validarIdade(dto.doador_data_nascimento);

    // Se o CPF já está cadastrado, paramos aqui. Sem isso, o MS4 devolveria o usuário que já
    // existe e, se o INSERT falhasse, desativaríamos o usuário de um doador de verdade.
    const jaExiste = await this.prisma.doador.findFirst({ where: { doador_cpf: dto.doador_cpf } });
    if (jaExiste) throw new ConflictException('Já existe um doador cadastrado com este CPF.');

    // O nome no MS4 é só um rótulo (limite de 150 caracteres; aqui o limite é 255).
    
    const usuario = await this.ms4.criarUsuarioDoador(dto.doador_cpf, dto.doador_nome.slice(0, 150));

    try {
      return await this.prisma.doador.create({
        data: {
          usuario_id: usuario.id,
          doador_nome: dto.doador_nome,
          doador_cpf: dto.doador_cpf,
          doador_data_nascimento: nascimento,
          doador_genero: dto.doador_genero,
          doador_tipo_sanguineo: dto.doador_tipo_sanguineo ?? null,
          // No banco o valor é '+' ou '-'; no Prisma os nomes são POSITIVO e NEGATIVO.
          doador_fator_rh: this.converterFatorRh(dto.doador_fator_rh),
          doador_telefone: dto.doador_telefone,
          doador_email: dto.doador_email,
          doador_cep: dto.doador_cep,
          doador_endereco: dto.doador_endereco,
          doador_status: STATUS_ATIVO,
        },
      });
    } catch (erro) {
      // Desfaz no MS4 só se o usuário foi criado agora (se já existia, não é nosso para desfazer).
      if (usuario.criado) await this.ms4.desativarUsuario(usuario.id);
      throw erro;
    }
  }

  // POST /internal/doadores/validar-login - o MS4 pergunta se CPF + data de nascimento conferem.
  // Só responde sim/não. Mesma resposta para "CPF não existe", "data errada" e "doador inativo",
  // para ninguém descobrir pelo login quais CPFs estão cadastrados.
  async validarLogin(cpf: string, dataNascimento: string): Promise<{ valido: boolean }> {
    const doador = await this.prisma.doador.findFirst({
      where: { doador_cpf: cpf, doador_status: STATUS_ATIVO },
    });
    if (!doador) return { valido: false };
    // O banco guarda só a data (sem hora). Comparamos como texto AAAA-MM-DD, sem fuso horário.
    const nascimento = doador.doador_data_nascimento.toISOString().slice(0, 10);
    return { valido: nascimento === dataNascimento };
  }
 
  // PUT /doadores/:id - atualiza dados cadastrais (a gestão altera qualquer um; o doador, o próprio)
  async atualizar(id: number, dto: UpdateDoadorDto, solicitante: UsuarioAutenticado) {
    const doador = await this.buscarAtivoOuFalhar(id); // 404 antes de qualquer outra coisa
    this.garantirAcesso(doador.usuario_id, solicitante, PERFIS_GESTAO);

    // Tipo sanguíneo e fator RH só a Recepção/Admin informam (o dado só é confiável depois do exame).
    const mexeNoSangue = dto.doador_tipo_sanguineo !== undefined || dto.doador_fator_rh !== undefined;
    if (mexeNoSangue && !PERFIS_GESTAO.includes(solicitante.role)) {
      throw new ForbiddenException('Só a Recepção ou o Admin podem informar tipo sanguíneo e fator RH.');
    }

    const { doador_fator_rh, ...demais } = dto;
    return this.prisma.doador.update({
      where: { doador_id: id },
      data: {
        ...demais,
        // '+'/'-' da API viram POSITIVO/NEGATIVO no Prisma. Se não veio, não altera.
        ...(doador_fator_rh !== undefined && { doador_fator_rh: this.converterFatorRh(doador_fator_rh) }),
      },
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
 
  // '+' -> POSITIVO, '-' -> NEGATIVO, ausente -> null (o campo é opcional).
  private converterFatorRh(valor?: string) {
    if (valor === undefined) return null;
    return valor === '+' ? 'POSITIVO' : 'NEGATIVO';
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