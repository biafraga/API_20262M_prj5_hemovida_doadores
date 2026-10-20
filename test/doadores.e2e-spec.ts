import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';

// Estes testes sobem a API de verdade (rotas, pipes, guards e filtro), mas com um banco de mentira.
// O ConfigModule valida o ambiente assim que o AppModule é importado, por isso as variáveis
// são definidas ANTES, e o AppModule é carregado depois (import dinâmico).
const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres!!';
process.env.DATABASE_URL = 'mysql://usuario:senha@localhost:3306/banco_de_teste';
process.env.JWT_SECRET = SEGREDO;
process.env.JWT_EXPIRES_IN = '1h';
process.env.PORT = '3000';

const prismaMock = {
  doador: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

const doadorNoBanco = { doador_id: 1, usuario_id: 7, doador_nome: 'Maria', doador_status: 1 };

const corpoValido = {
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

describe('Doadores (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  const token = (role: string, sub = 1) => `Bearer ${jwt.sign({ sub, role })}`;
  const admin = () => token('ADMIN', 99);
  const recepcao = () => token('RECEPCAO', 98);
  const enfermagem = () => token('ENFERMAGEM', 97);
  const doadorDono = () => token('DOADOR', 7);
  const outroDoador = () => token('DOADOR', 8);

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module');
    const { configurarApp } = await import('../src/app.setup');
    const { PrismaService } = await import('../src/prisma/prisma.service');

    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
    jwt = new JwtService({ secret: SEGREDO });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prismaMock.$queryRaw.mockResolvedValue(1);
  });

  describe('autenticação', () => {
    it('GET /health é público', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);
    });

    it('sem token: 401', async () => {
      await request(app.getHttpServer()).get('/doadores').expect(401);
    });

    it('token com assinatura falsa: 401', async () => {
      const falso = new JwtService({ secret: 'outro-segredo-qualquer-com-32-caracteres' }).sign({
        sub: 1,
        role: 'ADMIN',
      });
      await request(app.getHttpServer())
        .get('/doadores')
        .set('Authorization', `Bearer ${falso}`)
        .expect(401);
    });

    it('token com perfil desconhecido: 401', async () => {
      await request(app.getHttpServer())
        .get('/doadores')
        .set('Authorization', token('SUPER_ADMIN'))
        .expect(401);
    });

    it('token expirado: 401', async () => {
      const expirado = jwt.sign({ sub: 1, role: 'ADMIN' }, { expiresIn: '-1h' });
      await request(app.getHttpServer())
        .get('/doadores')
        .set('Authorization', `Bearer ${expirado}`)
        .expect(401);
    });

    it('a mensagem do 401 não diz o motivo (expirado ou falso)', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/doadores')
        .set('Authorization', 'Bearer lixo')
        .expect(401);
      expect(resposta.body.message).toBe('Token inválido ou expirado');
    });
  });

  describe('GET /doadores (listagem paginada)', () => {
    beforeEach(() => {
      prismaMock.doador.count.mockResolvedValue(25);
      prismaMock.doador.findMany.mockResolvedValue([doadorNoBanco]);
    });

    it('doador comum não lista os dados dos outros: 403', async () => {
      await request(app.getHttpServer())
        .get('/doadores')
        .set('Authorization', doadorDono())
        .expect(403);
    });

    it('gestor do estoque também não: 403', async () => {
      await request(app.getHttpServer())
        .get('/doadores')
        .set('Authorization', token('GESTOR_ESTOQUE'))
        .expect(403);
    });

    it.each([
      ['admin', admin],
      ['recepção', recepcao],
      ['enfermagem', enfermagem],
    ])('%s lista: 200, com data e meta', async (_nome, quem) => {
      const resposta = await request(app.getHttpServer())
        .get('/doadores')
        .set('Authorization', quem())
        .expect(200);

      expect(resposta.body.data).toHaveLength(1);
      expect(resposta.body.meta).toEqual({ total: 25, page: 1, limit: 10, totalPages: 3 });
    });

    it('respeita ?page e ?limit', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/doadores?page=2&limit=5')
        .set('Authorization', admin())
        .expect(200);

      expect(resposta.body.meta).toMatchObject({ page: 2, limit: 5, totalPages: 5 });
      expect(prismaMock.doador.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });

    it.each(['page=0', 'page=-1', 'page=abc', 'limit=0', 'limit=101', 'limit=1.5', 'foo=1'])(
      'recusa parâmetro inválido (%s): 400',
      async (consulta) => {
        await request(app.getHttpServer())
          .get(`/doadores?${consulta}`)
          .set('Authorization', admin())
          .expect(400);
      },
    );
  });

  describe('GET /doadores/:id e /doadores/cpf/:cpf', () => {
    it('a equipe busca por id: 200', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(doadorNoBanco);
      await request(app.getHttpServer())
        .get('/doadores/1')
        .set('Authorization', recepcao())
        .expect(200);
    });

    it('o doador vê o próprio cadastro: 200', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(doadorNoBanco);
      await request(app.getHttpServer())
        .get('/doadores/1')
        .set('Authorization', doadorDono())
        .expect(200);
    });

    it('o doador NÃO vê o cadastro de outro: 403', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(doadorNoBanco);
      await request(app.getHttpServer())
        .get('/doadores/1')
        .set('Authorization', outroDoador())
        .expect(403);
    });

    it('id inexistente: 404', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(null);
      await request(app.getHttpServer())
        .get('/doadores/99999')
        .set('Authorization', admin())
        .expect(404);
    });

    it('id que não é número: 400', async () => {
      await request(app.getHttpServer())
        .get('/doadores/abc')
        .set('Authorization', admin())
        .expect(400);
    });

    it('busca por CPF: 200 para a equipe', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(doadorNoBanco);
      await request(app.getHttpServer())
        .get('/doadores/cpf/12345678901')
        .set('Authorization', recepcao())
        .expect(200);
    });

    it('busca por CPF: 403 para o doador (ela vaza dados de terceiros)', async () => {
      await request(app.getHttpServer())
        .get('/doadores/cpf/12345678901')
        .set('Authorization', doadorDono())
        .expect(403);
    });

    it('busca por CPF inexistente: 404', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(null);
      await request(app.getHttpServer())
        .get('/doadores/cpf/00000000000')
        .set('Authorization', admin())
        .expect(404);
    });
  });

  describe('POST /doadores', () => {
    beforeEach(() => {
      prismaMock.doador.create.mockResolvedValue({ doador_id: 2, ...corpoValido });
    });

    it('recepção cadastra: 201', async () => {
      await request(app.getHttpServer())
        .post('/doadores')
        .set('Authorization', recepcao())
        .send(corpoValido)
        .expect(201);
    });

    it('o doador cadastra o próprio perfil: 201', async () => {
      await request(app.getHttpServer())
        .post('/doadores')
        .set('Authorization', doadorDono())
        .send(corpoValido)
        .expect(201);
    });

    it('o doador não cadastra o perfil de outro usuário: 403', async () => {
      await request(app.getHttpServer())
        .post('/doadores')
        .set('Authorization', outroDoador())
        .send(corpoValido)
        .expect(403);
    });

    it('enfermagem não cadastra: 403', async () => {
      await request(app.getHttpServer())
        .post('/doadores')
        .set('Authorization', enfermagem())
        .send(corpoValido)
        .expect(403);
    });

    it('sem token: 401', async () => {
      await request(app.getHttpServer()).post('/doadores').send(corpoValido).expect(401);
    });

    it.each(['2000-02-31', '2001-02-29', '2000-04-31', '1990-13-45', '10/03/1995', 'abc'])(
      'recusa data de nascimento inválida (%s): 400, sem gravar',
      async (data) => {
        const resposta = await request(app.getHttpServer())
          .post('/doadores')
          .set('Authorization', recepcao())
          .send({ ...corpoValido, doador_data_nascimento: data })
          .expect(400);

        expect(JSON.stringify(resposta.body.message)).toContain('doador_data_nascimento');
        expect(prismaMock.doador.create).not.toHaveBeenCalled();
      },
    );

    it('recusa menor de 18 anos: 400', async () => {
      await request(app.getHttpServer())
        .post('/doadores')
        .set('Authorization', recepcao())
        .send({ ...corpoValido, doador_data_nascimento: '2015-01-01' })
        .expect(400);
    });

    it('recusa maior de 69 anos: 400', async () => {
      await request(app.getHttpServer())
        .post('/doadores')
        .set('Authorization', recepcao())
        .send({ ...corpoValido, doador_data_nascimento: '1940-01-01' })
        .expect(400);
    });

    it.each([
      ['CPF curto', { doador_cpf: '123' }],
      ['CPF com pontuação', { doador_cpf: '123.456.789-01' }],
      ['CEP com hífen', { doador_cep: '20031-170' }],
      ['tipo sanguíneo inexistente', { doador_tipo_sanguineo: 'H' }],
      ['fator RH inexistente', { doador_fator_rh: 'x' }],
      ['e-mail inválido', { doador_email: 'maria@' }],
      ['nome com emoji', { doador_nome: 'Maria 😀' }],
      ['campo que o cliente não pode mandar (status)', { doador_status: 0 }],
      ['campo desconhecido', { campo_inventado: 'x' }],
    ])('recusa %s: 400', async (_motivo, alteracao) => {
      await request(app.getHttpServer())
        .post('/doadores')
        .set('Authorization', recepcao())
        .send({ ...corpoValido, ...alteracao })
        .expect(400);
      expect(prismaMock.doador.create).not.toHaveBeenCalled();
    });

    it('CPF repetido vira 409, sem vazar detalhes do Prisma', async () => {
      const { Prisma } = await import('../src/generated/prisma/client');
      prismaMock.doador.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed on doador_cpf', {
          code: 'P2002',
          clientVersion: '7',
        }),
      );

      const resposta = await request(app.getHttpServer())
        .post('/doadores')
        .set('Authorization', recepcao())
        .send(corpoValido)
        .expect(409);

      expect(resposta.body.error).toBe('CONFLICT');
      expect(JSON.stringify(resposta.body)).not.toMatch(/P2002|doador_cpf|constraint/i);
    });
  });

  describe('PUT /doadores/:id', () => {
    beforeEach(() => {
      prismaMock.doador.findFirst.mockResolvedValue(doadorNoBanco);
      prismaMock.doador.update.mockResolvedValue({ ...doadorNoBanco, doador_telefone: '21988887777' });
    });

    it('recepção atualiza o telefone: 200', async () => {
      await request(app.getHttpServer())
        .put('/doadores/1')
        .set('Authorization', recepcao())
        .send({ doador_telefone: '21988887777' })
        .expect(200);
    });

    it('o doador atualiza o próprio cadastro: 200', async () => {
      await request(app.getHttpServer())
        .put('/doadores/1')
        .set('Authorization', doadorDono())
        .send({ doador_telefone: '21988887777' })
        .expect(200);
    });

    it('o doador não atualiza o cadastro de outro: 403', async () => {
      await request(app.getHttpServer())
        .put('/doadores/1')
        .set('Authorization', outroDoador())
        .send({ doador_telefone: '21988887777' })
        .expect(403);
      expect(prismaMock.doador.update).not.toHaveBeenCalled();
    });

    it('enfermagem não atualiza: 403', async () => {
      await request(app.getHttpServer())
        .put('/doadores/1')
        .set('Authorization', enfermagem())
        .send({ doador_telefone: '21988887777' })
        .expect(403);
    });

    it.each([
      ['CPF', { doador_cpf: '11111111111' }],
      ['data de nascimento', { doador_data_nascimento: '2000-01-01' }],
      ['tipo sanguíneo', { doador_tipo_sanguineo: 'A' }],
      ['status', { doador_status: 0 }],
      ['usuario_id', { usuario_id: 5 }],
    ])('recusa alterar %s: 400', async (_campo, corpo) => {
      await request(app.getHttpServer())
        .put('/doadores/1')
        .set('Authorization', admin())
        .send(corpo)
        .expect(400);
      expect(prismaMock.doador.update).not.toHaveBeenCalled();
    });

    it('doador inexistente: 404', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(null);
      await request(app.getHttpServer())
        .put('/doadores/99999')
        .set('Authorization', admin())
        .send({ doador_telefone: '21988887777' })
        .expect(404);
    });
  });

  describe('DELETE /doadores/:id (soft delete)', () => {
    beforeEach(() => {
      prismaMock.doador.findFirst.mockResolvedValue(doadorNoBanco);
      prismaMock.doador.update.mockResolvedValue({});
    });

    it('recepção inativa: 200, e grava status 0 em vez de apagar', async () => {
      await request(app.getHttpServer())
        .delete('/doadores/1')
        .set('Authorization', recepcao())
        .expect(200);

      expect(prismaMock.doador.update).toHaveBeenCalledWith({
        where: { doador_id: 1 },
        data: { doador_status: 0 },
      });
    });

    it('o doador não inativa ninguém, nem o próprio perfil: 403', async () => {
      await request(app.getHttpServer())
        .delete('/doadores/1')
        .set('Authorization', doadorDono())
        .expect(403);
      expect(prismaMock.doador.update).not.toHaveBeenCalled();
    });

    it('doador inexistente: 404', async () => {
      prismaMock.doador.findFirst.mockResolvedValue(null);
      await request(app.getHttpServer())
        .delete('/doadores/99999')
        .set('Authorization', admin())
        .expect(404);
    });
  });
});