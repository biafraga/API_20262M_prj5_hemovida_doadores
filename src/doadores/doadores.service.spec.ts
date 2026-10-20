import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Perfil, UsuarioAutenticado } from '../auth/tipos/usuario-autenticado';
import { PrismaService } from '../prisma/prisma.service';
import { DoadoresService } from './doadores.service';
import { CreateDoadorDto } from './dto/create-doador.dto';

// Banco de mentira: os testes de service não tocam no MySQL.
const prismaMock = {
  doador: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

// Gera a data de nascimento (AAAA-MM-DD) de quem tem `anos` anos e `dias` dias a mais (ou a menos).
function nascidoHa(anos: number, dias = 0): string {
  const hoje = new Date();
  const data = new Date(
    Date.UTC(hoje.getUTCFullYear() - anos, hoje.getUTCMonth(), hoje.getUTCDate() + dias),
  );
  return data.toISOString().slice(0, 10);
}

const admin: UsuarioAutenticado = { sub: 99, role: Perfil.ADMIN };
const recepcao: UsuarioAutenticado = { sub: 98, role: Perfil.RECEPCAO };
const doadorDono: UsuarioAutenticado = { sub: 7, role: Perfil.DOADOR };
const outroDoador: UsuarioAutenticado = { sub: 8, role: Perfil.DOADOR };

const doadorNoBanco = { doador_id: 1, usuario_id: 7, doador_nome: 'Maria', doador_status: 1 };

const dtoValido: CreateDoadorDto = {
  usuario_id: 7,
  doador_nome: 'Maria Silva',
  doador_cpf: '12345678901',
  doador_data_nascimento: '1995-03-10',
  doador_genero: 'Feminino',
  doador_tipo_sanguineo: 'O',
  doador_fator_rh: '+',
  doador_telefone: '21999990000',
  doador_email: 'maria@exemplo.com',
  doador_cep: '20031170',
  doador_endereco: 'Rua A, 10',
};

describe('DoadoresService', () => {
  let service: DoadoresService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const modulo = await Test.createTestingModule({
      providers: [DoadoresService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = modulo.get(DoadoresService);
  });

  describe('listar', () => {
    it('devolve os dados e os metadados de paginação, só dos ativos', async () => {
      prismaMock.doador.count.mockResolvedValue(25);
      prismaMock.doador.findMany.mockResolvedValue([doadorNoBanco]);

      const resposta = await service.listar({ page: 1, limit: 10 });

      expect(resposta).toEqual({
        data: [doadorNoBanco],
        meta: { total: 25, page: 1, limit: 10, totalPages: 3 },
      });
      expect(prismaMock.doador.findMany).toHaveBeenCalledWith({
        where: { doador_status: 1 },
        orderBy: { doador_id: 'asc' },
        skip: 0,
        take: 10,
      });
    });

    it('pula os registros das páginas anteriores', async () => {
      prismaMock.doador.count.mockResolvedValue(25);
      prismaMock.doador.findMany.mockResolvedValue([]);

      await service.listar({ page: 3, limit: 5 });

      expect(prismaMock.doador.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('com a tabela vazia, devolve 0 páginas', async () => {
      prismaMock.doador.count.mockResolvedValue(0);
      prismaMock.doador.findMany.mockResolvedValue([]);

      const resposta = await service.listar({ page: 1, limit: 10 });

      expect(resposta.meta.totalPages).toBe(0);
    });
  });

  describe('buscarPorId', () => {
    it('lança 404 quando o doador não existe ou está inativo', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(null);
      await expect(service.buscarPorId(1, admin)).rejects.toThrow(NotFoundException);
    });

    it('a equipe vê qualquer doador', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(doadorNoBanco);
      await expect(service.buscarPorId(1, recepcao)).resolves.toEqual(doadorNoBanco);
    });

    it('o doador vê o próprio cadastro', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(doadorNoBanco);
      await expect(service.buscarPorId(1, doadorDono)).resolves.toEqual(doadorNoBanco);
    });

    it('o doador NÃO vê o cadastro de outro doador (403)', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(doadorNoBanco);
      await expect(service.buscarPorId(1, outroDoador)).rejects.toThrow(ForbiddenException);
    });

    it('só busca doadores ativos', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(doadorNoBanco);
      await service.buscarPorId(1, admin);
      expect(prismaMock.doador.findFirst).toHaveBeenCalledWith({
        where: { doador_id: 1, doador_status: 1 },
      });
    });
  });

  describe('buscarPorCpf', () => {
    it('devolve o doador encontrado', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(doadorNoBanco);
      await expect(service.buscarPorCpf('12345678901')).resolves.toEqual(doadorNoBanco);
    });

    it('lança 404 quando não encontra', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(null);
      await expect(service.buscarPorCpf('00000000000')).rejects.toThrow(NotFoundException);
    });
  });

  describe('criar', () => {
    beforeEach(() => {
      prismaMock.doador.create.mockResolvedValue({ doador_id: 2 });
    });

    it('grava o doador como ativo, mesmo que o cliente tente decidir o status', async () => {
      await service.criar(dtoValido, recepcao);

      const { data } = prismaMock.doador.create.mock.calls[0][0];
      expect(data.doador_status).toBe(1);
      expect(data.doador_cpf).toBe('12345678901');
    });

    it("converte o fator RH: '+' vira POSITIVO e '-' vira NEGATIVO", async () => {
      await service.criar({ ...dtoValido, doador_fator_rh: '+' }, recepcao);
      await service.criar({ ...dtoValido, doador_fator_rh: '-' }, recepcao);

      expect(prismaMock.doador.create.mock.calls[0][0].data.doador_fator_rh).toBe('POSITIVO');
      expect(prismaMock.doador.create.mock.calls[1][0].data.doador_fator_rh).toBe('NEGATIVO');
    });

    it('grava a data de nascimento como UTC, sem recuar um dia', async () => {
      await service.criar(dtoValido, recepcao);
      const { data } = prismaMock.doador.create.mock.calls[0][0];
      expect(data.doador_data_nascimento.toISOString()).toBe('1995-03-10T00:00:00.000Z');
    });

    describe('RN01: idade de 18 a 69 anos', () => {
      it('aceita quem faz 18 anos hoje', async () => {
        await service.criar({ ...dtoValido, doador_data_nascimento: nascidoHa(18) }, recepcao);
        expect(prismaMock.doador.create).toHaveBeenCalled();
      });

      it('recusa quem ainda tem 17 anos (faz 18 amanhã)', async () => {
        const dto = { ...dtoValido, doador_data_nascimento: nascidoHa(18, 1) };
        await expect(service.criar(dto, recepcao)).rejects.toThrow(BadRequestException);
        expect(prismaMock.doador.create).not.toHaveBeenCalled();
      });

      it('aceita quem tem 69 anos (faz 70 amanhã)', async () => {
        await service.criar({ ...dtoValido, doador_data_nascimento: nascidoHa(70, 1) }, recepcao);
        expect(prismaMock.doador.create).toHaveBeenCalled();
      });

      it('recusa quem fez 70 anos hoje', async () => {
        const dto = { ...dtoValido, doador_data_nascimento: nascidoHa(70) };
        await expect(service.criar(dto, recepcao)).rejects.toThrow(BadRequestException);
        expect(prismaMock.doador.create).not.toHaveBeenCalled();
      });

      it('recusa data de nascimento no futuro', async () => {
        const dto = { ...dtoValido, doador_data_nascimento: nascidoHa(-1) };
        await expect(service.criar(dto, recepcao)).rejects.toThrow(BadRequestException);
      });
    });

    describe('datas impossíveis', () => {
      it.each(['2000-02-31', '2001-02-29', '2000-04-31', '1990-13-45'])(
        'recusa %s em vez de convertê-la em outra data',
        async (data) => {
          const dto = { ...dtoValido, doador_data_nascimento: data };
          await expect(service.criar(dto, recepcao)).rejects.toThrow(BadRequestException);
          expect(prismaMock.doador.create).not.toHaveBeenCalled();
        },
      );
    });

    describe('quem pode cadastrar', () => {
      it('o doador cadastra o próprio perfil', async () => {
        await service.criar({ ...dtoValido, usuario_id: 7 }, doadorDono);
        expect(prismaMock.doador.create).toHaveBeenCalled();
      });

      it('o doador NÃO cadastra o perfil de outro usuário (403)', async () => {
        await expect(service.criar({ ...dtoValido, usuario_id: 7 }, outroDoador)).rejects.toThrow(
          ForbiddenException,
        );
        expect(prismaMock.doador.create).not.toHaveBeenCalled();
      });

      it('a recepção cadastra para qualquer usuário', async () => {
        await service.criar({ ...dtoValido, usuario_id: 123 }, recepcao);
        expect(prismaMock.doador.create).toHaveBeenCalled();
      });
    });
  });

  describe('atualizar', () => {
    beforeEach(() => {
      prismaMock.doador.update.mockResolvedValue({ ...doadorNoBanco, doador_telefone: '21988887777' });
    });

    it('lança 404 sem atualizar quando o doador não existe', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(null);
      await expect(service.atualizar(1, { doador_telefone: '1' }, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.doador.update).not.toHaveBeenCalled();
    });

    it('a recepção atualiza qualquer doador, e só com os campos enviados', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(doadorNoBanco);

      await service.atualizar(1, { doador_telefone: '21988887777' }, recepcao);

      expect(prismaMock.doador.update).toHaveBeenCalledWith({
        where: { doador_id: 1 },
        data: { doador_telefone: '21988887777' },
      });
    });

    it('o doador atualiza o próprio cadastro', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(doadorNoBanco);
      await service.atualizar(1, { doador_telefone: '21988887777' }, doadorDono);
      expect(prismaMock.doador.update).toHaveBeenCalled();
    });

    it('o doador NÃO atualiza o cadastro de outro (403)', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(doadorNoBanco);
      await expect(
        service.atualizar(1, { doador_telefone: '21988887777' }, outroDoador),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.doador.update).not.toHaveBeenCalled();
    });
  });

  describe('remover (soft delete)', () => {
    it('inativa o doador em vez de apagar a linha', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(doadorNoBanco);
      prismaMock.doador.update.mockResolvedValue({});

      const resposta = await service.remover(1);

      expect(prismaMock.doador.update).toHaveBeenCalledWith({
        where: { doador_id: 1 },
        data: { doador_status: 0 },
      });
      expect(resposta.mensagem).toContain('inativado');
    });

    it('lança 404 quando o doador não existe, ou já está inativo', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(null);
      await expect(service.remover(1)).rejects.toThrow(NotFoundException);
      expect(prismaMock.doador.update).not.toHaveBeenCalled();
    });
  });
});