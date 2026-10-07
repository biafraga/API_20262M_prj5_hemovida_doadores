import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoadorDto } from './dto/create-doador.dto';
import { UpdateDoadorDto } from './dto/update-doador.dto';
import { paraDataUtc } from '../common/helpers/data';
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

  // GET /doadores - lista só os doadores ativos
  listar() {
    return this.prisma.doador.findMany({
      where: { doador_status: STATUS_ATIVO },
      orderBy: { doador_id: 'asc' },
    });
  }

  // GET /doadores/:id
  async buscarPorId(id: number) {
    const doador = await this.prisma.doador.findFirst({
      where: { doador_id: id, doador_status: STATUS_ATIVO },
    });
    if (!doador) throw new NotFoundException(`Doador ${id} não encontrado.`);
    return doador;
  }

  // GET /doadores/cpf/:cpf - usado na barra de pesquisa da Recepção
  async buscarPorCpf(cpf: string) {
    const doador = await this.prisma.doador.findFirst({
      where: { doador_cpf: cpf, doador_status: STATUS_ATIVO },
    });
    if (!doador) throw new NotFoundException(`Doador com o CPF ${cpf} não encontrado.`);
    return doador;
  }

  // POST /doadores
  async criar(dto: CreateDoadorDto) {
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
        doador_status: STATUS_ATIVO, // quem decide é o sistema, não o cliente
      },
    });
  }

  // PUT /doadores/:id - atualiza dados cadastrais
  async atualizar(id: number, dto: UpdateDoadorDto) {
    await this.buscarPorId(id); // 404 antes de qualquer outra coisa
    return this.prisma.doador.update({
      where: { doador_id: id },
      data: dto,
    });
  }

  // DELETE /doadores/:id - soft delete: o registro continua no banco, só fica inativo
  async remover(id: number) {
    await this.buscarPorId(id);
    await this.prisma.doador.update({
      where: { doador_id: id },
      data: { doador_status: STATUS_INATIVO },
    });
    return { mensagem: `Doador ${id} inativado com sucesso.` };
  }

  // Converte a string em Date e aplica a RN01. Devolve a data pronta para o banco.
  private validarIdade(dataNascimento: string): Date {
    const nascimento = paraDataUtc(dataNascimento) as Date;

    // `2000-13-45` passa no formato do DTO, mas não é uma data real.
    if (Number.isNaN(nascimento.getTime())) {
      throw new BadRequestException('doador_data_nascimento não é uma data válida.');
    }

    const idade = calcularIdade(nascimento);
    if (idade < IDADE_MINIMA || idade > IDADE_MAXIMA) {
      throw new BadRequestException(
        `Doador fora da faixa etária permitida (${IDADE_MINIMA} a ${IDADE_MAXIMA} anos).`,
      );
    }
    return nascimento;
  }
}