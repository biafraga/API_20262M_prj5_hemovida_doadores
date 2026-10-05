import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CreateDoadorDto } from './dto/create-doador.dto';
import { paraDataUtc } from '../common/helpers/data';

@Injectable()
export class DoadoresService {
  constructor(private readonly prisma: PrismaService) {}

  // GET - lista todos os doadores ou faz busca geral
  async listar() {
    return this.prisma.doador.findMany({
      orderBy: { doador_id: 'asc' },
    });
  }

  // GET - busca um doador específico através do CPF (para a Recepção)
  async buscarPorCpf(cpf: string) {
    const doador = await this.prisma.doador.findFirst({
      where: { doador_cpf: cpf },
    });

    if (!doador) {
      throw new NotFoundException(`Doador com o CPF ${cpf} não encontrado.`);
    }

    return doador;
  }

  // POST - salva um novo doador
  async criar(dto: CreateDoadorDto) {
    try {
      // Converte o símbolo recebido para o enum esperado pelo Prisma
      const fatorRhPrisma = dto.doador_fator_rh === '+' ? 'POSITIVO' : 'NEGATIVO';

      return await this.prisma.doador.create({
        data: {
          usuario_id: dto.usuario_id,
          doador_nome: dto.doador_nome,
          doador_cpf: dto.doador_cpf,
          doador_data_nascimento: paraDataUtc(dto.doador_data_nascimento) as Date,
          doador_genero: dto.doador_genero as any,
          doador_tipo_sanguineo: dto.doador_tipo_sanguineo as any,
          doador_fator_rh: fatorRhPrisma as any, // variável convertida 
          doador_telefone: dto.doador_telefone,
          doador_email: dto.doador_email,
          doador_cep: dto.doador_cep,
          doador_endereco: dto.doador_endereco,
          doador_status: dto.doador_status,
        },
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('Já existe um doador cadastrado com este CPF ou e-mail.');
      }
      throw erro;
    }
  }
}