# HemoVida · MS1 Doadores

Microsserviço de **doadores** do projeto integrador HemoVida, uma plataforma que simula a gestão do ciclo do sangue na rede pública de saúde (SUS). O MS1 cuida do cadastro do doador, da consulta pela equipe do hemocentro e da validação do login do doador (CPF e data de nascimento) para o MS4.

## Sumário

1. [Visão geral e arquitetura](#1-visão-geral-e-arquitetura)
2. [Tecnologias](#2-tecnologias)
3. [Como rodar](#3-como-rodar)
4. [Variáveis de ambiente](#4-variáveis-de-ambiente)
5. [Autenticação e perfis](#5-autenticação-e-perfis)
6. [Rotas da API](#6-rotas-da-api)
7. [Exemplos de uso](#7-exemplos-de-uso)
8. [Regras de negócio](#8-regras-de-negócio)
9. [Códigos de erro](#9-códigos-de-erro)
10. [Banco de dados](#10-banco-de-dados)
11. [Docker, Jenkins e deploy](#11-docker-jenkins-e-deploy)
12. [Estrutura do projeto](#12-estrutura-do-projeto)
13. [Próximos passos](#13-próximos-passos)

---

## 1. Visão geral e arquitetura

O HemoVida é dividido em microsserviços. Cada um tem o seu próprio banco, e nenhum acessa o banco do outro: a conversa entre eles é sempre por HTTP.

| Serviço | Responsabilidade | Porta |
| --- | --- | --- |
| Front-end (Next.js) | Telas do doador e da equipe | 7500 |
| Gateway | Porta de entrada única da API | 7501 |
| **MS1 Doadores (este repositório)** | Cadastro e consulta de doadores | **7502** |
| MS2 Estoque | Estoque de sangue | ver repositório do MS2 |
| MS3 Demanda | Pedidos dos hospitais | ver repositório do MS3 |
| MS4 Usuários | Login e usuários de todos os perfis | 7505 |

Endereço público: `http://academico3.rj.senac.br/hemovida`. A API pública passa pelo gateway: `http://academico3.rj.senac.br/hemovida/gateway`.

```
Navegador -> Front (7500) -> Gateway (7501) -> MS1 Doadores (7502) -> MySQL (banco do MS1)
                                  |                  ^   |
                                  +-> MS4 Usuários <-+   |
                                      (login, JWT)   rotas internas com x-service-key
```

Como o MS1 e o MS4 conversam:

- O **MS4 emite o token JWT**. O MS1 só confere o token (os dois usam o mesmo `JWT_SECRET`).
- No **cadastro** do doador, o MS1 pede ao MS4 que crie o usuário (rota interna).
- No **login** do doador, o MS4 pergunta ao MS1 se CPF e data de nascimento conferem (rota interna).
- As rotas internas são protegidas por um segredo compartilhado (`x-service-key`) e **não passam pelo gateway**.

## 2. Tecnologias

| Item | Versão / uso |
| --- | --- |
| Node.js | 24 (LTS) |
| NestJS | 12 |
| Prisma + driver MariaDB | 7.10.0 (conecta no MySQL) |
| MySQL | banco da disciplina, isolado por microsserviço |
| class-validator / class-transformer | validação dos dados de entrada |
| @nestjs/jwt | conferência do token de acesso (HS256) |
| Infisical | guarda os segredos (nenhuma senha no repositório) |
| Docker / Docker Compose | execução em contêiner |
| Jenkins | deploy automático no servidor da faculdade |

## 3. Como rodar

### Pré-requisitos

- Node.js 24 e npm
- Infisical CLI logado no projeto (`infisical login`)
- Acesso ao banco MySQL da disciplina

### Passo a passo

```bash
npm install
npm run prisma:generate   # gera o cliente do Prisma (a pasta src/generated não vai para o GitHub)
npm run start:dev         # sobe a API em modo de desenvolvimento, com as variáveis do Infisical
```

Se o `prisma:generate` reclamar de `DATABASE_URL`, rode pelo Infisical:

```bash
infisical run -- npm run prisma:generate
```

Quando tudo estiver certo, o terminal mostra **"API no ar em http://localhost:7502"**. Para conferir:

```http
GET http://localhost:7502/health
```

```json
{ "status": "ok", "database": "up", "timestamp": "2026-11-26T12:00:00.000Z" }
```

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run start:dev` | Sobe a API com recarga automática, usando o Infisical (ambiente `dev`) |
| `npm run start:prod` | Sobe a API já compilada (`dist/main`), como no Docker |
| `npm run build` | Compila o projeto |
| `npm run prisma:generate` | Gera o cliente do Prisma |
| `npm run token -- ADMIN 1` | Gera um token de teste (perfil e id do usuário) para usar no Postman |

> `npm run start` (sem `:dev`) não carrega o Infisical, e a API não sobe por falta de variáveis.

## 4. Variáveis de ambiente

Os valores reais ficam no **Infisical**. O arquivo `.env.example` mostra o formato de cada uma.

| Variável | Obrigatória | Para quê |
| --- | --- | --- |
| `DATABASE_URL` | sim | Conexão MySQL, no formato `mysql://USUARIO:SENHA@HOST:3306/BANCO` |
| `JWT_SECRET` | sim | Segredo do token (mínimo 32 caracteres). **Tem que ser igual ao do MS4** |
| `JWT_EXPIRES_IN` | sim | Validade do token, por exemplo `15m`, `1h`, `7d` |
| `PORT` | sim | Porta da API (`7502`) |
| `SERVICE_KEY` | não* | Segredo compartilhado entre MS1 e MS4 (mínimo 32 caracteres, **igual nos dois**). Protege as rotas internas |
| `MS4_BASE_URL` | não* | Endereço direto do MS4, por exemplo `http://localhost:7505`. Não use o endereço do gateway |
| `CORS_ORIGIN` | não | Origens do front liberadas no navegador, separadas por vírgula. Sem ela, o CORS fica desligado |

\* Sem `SERVICE_KEY` e `MS4_BASE_URL` a API sobe normalmente, mas o cadastro e o login do doador respondem **503**.

## 5. Autenticação e perfis

Todas as rotas exigem token, exceto as marcadas como públicas. O token vai no cabeçalho:

```
Authorization: Bearer <token>
```

O token é um JWT (HS256) emitido pelo MS4, com este conteúdo:

```json
{ "sub": 5, "role": "DOADOR" }
```

- `sub` é o id do usuário no MS4. No MS1, ele é o `usuario_id` do doador.
- `role` é o perfil. Os perfis válidos são: `ADMIN`, `RECEPCAO`, `ENFERMAGEM`, `GESTOR_ESTOQUE`, `GESTOR_DEMANDA` e `DOADOR`.

A proteção funciona em duas camadas:

1. **Por perfil**, no controller, com `@Roles(...)`. Perfil sem permissão recebe **403**.
2. **Por registro**, no service. O `DOADOR` só acessa o próprio cadastro (o `usuario_id` do doador precisa ser igual ao `sub` do token). Senão, **403**.

Token ausente, inválido ou expirado devolve **401**.

Quem cria cada tipo de usuário:

- **DOADOR:** se cadastra sozinho, pelo `POST /doadores` (público). O MS1 só consegue pedir ao MS4 a criação de usuário com perfil DOADOR, e o corpo da requisição não aceita escolher o perfil.
- **ADMIN, RECEPCAO, ENFERMAGEM, GESTOR_ESTOQUE e GESTOR_DEMANDA:** criados só pelo Admin, no MS4. O MS1 não tem nenhuma rota para isso.

Grupos de perfis usados no código (`doadores.perfis.ts`):

- **Consulta:** ADMIN, RECEPCAO, ENFERMAGEM
- **Gestão:** ADMIN, RECEPCAO

## 6. Rotas da API

### Quem pode o quê

| Rota | ADMIN | RECEPCAO | ENFERMAGEM | DOADOR | Demais perfis |
| --- | --- | --- | --- | --- | --- |
| `GET /doadores` | sim | sim | sim | não | não |
| `GET /doadores/cpf/:cpf` | sim | sim | sim | não | não |
| `GET /doadores/me` | não | não | não | sim | não |
| `GET /doadores/:id` | sim | sim | sim | só o próprio | não |
| `POST /doadores` | pública (sem login) | pública | pública | pública | pública |
| `PUT /doadores/:id` | sim | sim | não | só o próprio* | não |
| `DELETE /doadores/:id` | sim | sim | não | não | não |
| `GET /health` | pública | pública | pública | pública | pública |

\* O doador **não** pode alterar tipo sanguíneo nem fator RH (veja a seção 8).

### Detalhes

| Rota | O que faz |
| --- | --- |
| `GET /doadores?page=1&limit=10` | Lista os doadores **ativos**, paginada. `page` começa em 1 (padrão 1). `limit` vai de 1 a 100 (padrão 10) |
| `GET /doadores/cpf/:cpf` | Busca por CPF (11 dígitos), para a recepção |
| `GET /doadores/me` | Devolve o cadastro de quem está logado (usa o `sub` do token) |
| `GET /doadores/:id` | Busca por id |
| `POST /doadores` | Cadastro público do doador. Cria no MS4 **apenas** um usuário com perfil DOADOR. Os perfis da equipe (ADMIN, RECEPCAO, ENFERMAGEM e gestores) são criados só pelo Admin, no MS4 |
| `PUT /doadores/:id` | Atualiza gênero, telefone, e-mail, CEP, endereço e (só ADMIN e RECEPCAO) tipo sanguíneo e fator RH |
| `DELETE /doadores/:id` | Inativação (soft delete): o registro continua no banco com `doador_status = 0` |
| `POST /internal/doadores/validar-login` | **Interna.** Só o MS4 chama, com `x-service-key`. Responde `{ "valido": true }` ou `{ "valido": false }` |

> A rota `GET /doadores/me` fica **antes** de `GET /doadores/:id` no código. Se fosse o contrário, o Nest trataria "me" como um id.

### Campos do doador

| Campo | Tipo | Regra |
| --- | --- | --- |
| `doador_nome` | texto | obrigatório, até 255 caracteres |
| `doador_cpf` | texto | obrigatório, exatamente 11 dígitos, sem pontos ou traço. Não pode se repetir |
| `doador_data_nascimento` | texto | obrigatório, `AAAA-MM-DD`, data que existe de verdade, idade de 18 a 69 anos |
| `doador_genero` | texto | obrigatório: `Feminino`, `Masculino` ou `Outros` |
| `doador_tipo_sanguineo` | texto | **opcional**: `A`, `B`, `AB` ou `O`. Fica vazio (`null`) até a Recepção confirmar |
| `doador_fator_rh` | texto | **opcional**: `+` ou `-` na entrada. Na resposta da API volta como `POSITIVO` ou `NEGATIVO` |
| `doador_telefone` | texto | obrigatório, até 15 caracteres |
| `doador_email` | texto | obrigatório, e-mail válido |
| `doador_cep` | texto | obrigatório, exatamente 8 dígitos, sem hífen |
| `doador_endereco` | texto | obrigatório, até 255 caracteres |

Campos que não estão nessa lista (por exemplo `usuario_id` ou `doador_status`) são **recusados com 400**. O `usuario_id` vem do MS4, nunca do corpo da requisição.

No `PUT`, só podem ser enviados: `doador_genero`, `doador_telefone`, `doador_email`, `doador_cep`, `doador_endereco`, `doador_tipo_sanguineo` e `doador_fator_rh`. Não dá para alterar nome, CPF nem data de nascimento.

## 7. Exemplos de uso

### Cadastro público

```http
POST /doadores
Content-Type: application/json

{
  "doador_nome": "Maria da Silva",
  "doador_cpf": "12345678909",
  "doador_data_nascimento": "1995-03-20",
  "doador_genero": "Feminino",
  "doador_telefone": "21999998888",
  "doador_email": "maria@email.com",
  "doador_cep": "20040020",
  "doador_endereco": "Rua Exemplo, 100, Centro, Rio de Janeiro"
}
```

Resposta **201** (tipo sanguíneo e fator RH vêm `null` até a Recepção preencher):

```json
{
  "doador_id": 12,
  "usuario_id": 5,
  "doador_nome": "Maria da Silva",
  "doador_cpf": "12345678909",
  "doador_data_nascimento": "1995-03-20T00:00:00.000Z",
  "doador_genero": "Feminino",
  "doador_tipo_sanguineo": null,
  "doador_fator_rh": null,
  "doador_telefone": "21999998888",
  "doador_email": "maria@email.com",
  "doador_cep": "20040020",
  "doador_endereco": "Rua Exemplo, 100, Centro, Rio de Janeiro",
  "doador_status": 1
}
```

### Lista paginada

```http
GET /doadores?page=2&limit=10
Authorization: Bearer <token de ADMIN, RECEPCAO ou ENFERMAGEM>
```

```json
{
  "data": [ { "doador_id": 11, "...": "..." } ],
  "meta": { "total": 37, "page": 2, "limit": 10, "totalPages": 4 }
}
```

### Recepção informa tipo sanguíneo e fator RH

```http
PUT /doadores/12
Authorization: Bearer <token de ADMIN ou RECEPCAO>
Content-Type: application/json

{ "doador_tipo_sanguineo": "O", "doador_fator_rh": "+" }
```

A resposta traz `"doador_tipo_sanguineo": "O"` e `"doador_fator_rh": "POSITIVO"`.

### Login do doador (rota interna, chamada pelo MS4)

```http
POST /internal/doadores/validar-login
x-service-key: <SERVICE_KEY>
Content-Type: application/json

{ "cpf": "12345678909", "dataNascimento": "1995-03-20" }
```

```json
{ "valido": true }
```

A resposta é a mesma para CPF inexistente, data errada ou doador inativo, para que ninguém descubra pelo login quais CPFs estão cadastrados.

### Testando no Postman sem o MS4

Gere um token de teste e use no cabeçalho `Authorization`:

```bash
npm run token -- ADMIN 1       # equipe
npm run token -- DOADOR 5      # doador com usuario_id = 5
```

## 8. Regras de negócio

- **RN01:** só doa quem tem de 18 a 69 anos. Fora disso, o cadastro é recusado (400).
- **Data real:** datas impossíveis como `2000-02-31` são recusadas.
- **CPF único:** CPF já cadastrado devolve **409**.
- **Cadastro com o MS4:** o MS1 valida tudo o que é dele antes de chamar o MS4. Se o usuário foi criado no MS4 mas a gravação do doador falha, o MS1 pede ao MS4 que desative o usuário criado.
- **Tipo sanguíneo e fator RH são opcionais.** O doador muitas vezes não sabe o próprio tipo sanguíneo, e é melhor não informar nada do que informar errado, porque esse dado é usado no estoque e na compatibilidade das bolsas. Por isso o auto-cadastro não pede esses campos. Depois da triagem e dos exames, quando o resultado confirma o tipo, a Recepção ou o Admin preenche pelo `PUT`. Se o DOADOR ou a ENFERMAGEM tentarem enviar esses campos, a resposta é **403**.
- **Soft delete:** o `DELETE` não apaga. Ele muda `doador_status` de 1 (ativo) para 0 (inativo). Doador inativo some das listagens, das buscas e do login.
- **Texto compatível com o banco:** nome e endereço aceitam só caracteres do conjunto Latin-1.

## 9. Códigos de erro

| Código | Quando acontece |
| --- | --- |
| 400 | Dados inválidos (campo faltando, formato errado, campo desconhecido, idade fora de 18 a 69, data que não existe, CPF inválido segundo o MS4) |
| 401 | Token não enviado, inválido ou expirado |
| 403 | Perfil sem permissão, ou doador tentando acessar dados de outro |
| 404 | Doador não encontrado (ou inativo) |
| 409 | CPF já cadastrado |
| 503 | MS4 fora do ar, demora acima de 5 segundos, ou `SERVICE_KEY` e `MS4_BASE_URL` não configurados |

Formato do erro:

```json
{ "statusCode": 404, "message": "Doador 99 não encontrado.", "error": "Not Found" }
```

## 10. Banco de dados

Cada microsserviço tem o seu banco, e o MS1 acessa só o dele. O script de criação está em `database/hemovida-doadores-v6.sql`. Aqui ficam só os pontos que afetam o uso da API:

- A tabela principal é `doador`. O `usuario_id` guarda o id do usuário criado no MS4.
- `doador_cpf` é único.
- `doador_tipo_sanguineo` e `doador_fator_rh` aceitam `NULL` (veja a seção 8).
- `doador_status` é 1 para ativo e 0 para inativo (soft delete).
- No Prisma, o fator RH aparece como `POSITIVO` (`+`) e `NEGATIVO` (`-`). A API aceita `+` e `-` na entrada e devolve `POSITIVO` e `NEGATIVO` na saída.

> Alterações na estrutura do banco (ALTER TABLE) são feitas pelo professor. As credenciais de acesso nunca ficam no repositório: vêm do Infisical.

## 11. Docker, Jenkins e deploy

**Docker.** O `Dockerfile` usa a imagem `node:24-bookworm-slim`, instala as dependências, gera o Prisma Client, compila o projeto e sobe com `npm run start:prod` na porta 7502.

**Docker Compose.** O `docker-compose.yml` sobe o serviço `hemovida-doadores` na porta 7502, lendo as variáveis do arquivo `.env`:

```bash
docker compose up --build
```

**Jenkins.** O `Jenkinsfile` executa estes passos:

1. Baixa o código da branch `main` no GitHub.
2. Busca os segredos no Infisical (ambiente `dev`, pasta `/hemovida`) e gera o `.env`, sem mostrar valores no log.
3. Valida o Docker Compose.
4. Constrói a imagem Docker.
5. Faz o deploy (`docker compose up -d`, recriando o contêiner).
6. Confere se o contêiner está rodando.

Por isso, **toda variável nova precisa existir no Infisical, na pasta `/hemovida` do ambiente `dev`**, senão ela não chega ao servidor.

## 12. Estrutura do projeto

```
src/
  auth/         guards (JWT, perfis, service key) e decorators (@Public, @Roles, @UsuarioAtual)
  common/       paginação, validadores (data real, Latin-1), helpers de data e idade, filtro de erros do Prisma
  config/       validação das variáveis de ambiente
  doadores/     controller, service, DTOs, rota interna e perfis do módulo de doadores
  health/       GET /health
  ms4/          cliente HTTP que conversa com o MS4
  prisma/       conexão com o banco
  main.ts       inicialização (porta, CORS)
prisma/         schema.prisma
database/       script SQL do banco
scripts/        gerar-token.js (token de teste)
```

Pontos de atenção do código:

- **Validação global:** `ValidationPipe` com `whitelist`, `forbidNonWhitelisted` e `transform`. Campo desconhecido no corpo gera 400.
- **Guards globais:** o JWT e os perfis valem para toda a API. `@Public()` abre uma exceção.
- **Erros do banco:** o filtro do Prisma traduz erros (por exemplo, valor duplicado vira 409) sem expor detalhes internos.

## 13. Próximos passos

- Swagger, para documentar e testar as rotas pelo navegador.
- Publicação do evento `bolsa.coletada` no RabbitMQ, após o registro da coleta (RF-05).
- Rotas das demais tabelas: doação, triagem e coleta.
- Limite de tentativas (rate limit) no cadastro público.
- Criptografia do CPF (RNF-MS1), o que exige ajustar o tamanho da coluna e decidir como fica a busca por CPF.
