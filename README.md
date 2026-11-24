# HemoVida · MS1 Doadores
 
Microsserviço de **doadores** do projeto integrador HemoVida, uma plataforma que simula a gestão do ciclo do sangue na rede pública de saúde (SUS). Ele cuida do cadastro do doador, e no futuro vai cuidar também da triagem, do agendamento e do registro da coleta.
 
Esta entrega (ciclo 1) contém o **CRUD de doador**, com autenticação por token, autorização por perfil, paginação e testes automatizados.
 
## Tecnologias
 
| Item | Versão / uso |
| --- | --- |
| Node.js | 24 (LTS) |
| NestJS | 12 |
| Prisma + driver MariaDB | 7.10.0 (conecta no MySQL) |
| MySQL | banco da disciplina, isolado por microsserviço |
| class-validator / class-transformer | validação dos dados de entrada |
| @nestjs/jwt | conferência do token de acesso |

## Instalação e execução
 
```bash
npm install
npm run prisma:generate    # gera o cliente do Prisma (a pasta src/generated não vai para o GitHub)
npm run start:dev          # sobe a API em modo de desenvolvimento
```
 
Quando tudo estiver certo, o terminal mostra **"Conectado ao banco de dados"** e **"API no ar em http://localhost:3000"**. Para conferir:
 
```http
GET http://localhost:3000/health
```
 
```json
{ "status": "ok", "database": "up", "timestamp": "2026-10-15T12:00:00.000Z" }
```

**Quem pode o quê:**
 
| Rota | ADMIN | RECEPCAO | ENFERMAGEM | DOADOR | Demais perfis |
| --- | --- | --- | --- | --- | --- |
| `GET /doadores` | sim | sim | sim | não | não |
| `GET /doadores/cpf/:cpf` | sim | sim | sim | não | não |
| `GET /doadores/:id` | sim | sim | sim | só o próprio | não |
| `POST /doadores` | pública (sem login) | pública | pública | pública | pública |
| `PUT /doadores/:id` | sim | sim | não | só o próprio | não |
| `DELETE /doadores/:id` | sim | sim | não | não | não |

## Integração com o MS4 (Usuários)

O login e os usuários ficam no MS4. O MS1 só confere o token (o `JWT_SECRET` precisa ser o mesmo nos serviços).

**Variáveis novas** (`.env` ou Infisical):

| Variável | Para quê |
| --- | --- |
| `SERVICE_KEY` | Segredo compartilhado MS1 e MS4 (mínimo 32 caracteres, o mesmo valor nos dois). Protege as rotas internas. |
| `MS4_BASE_URL` | Endereço direto do MS4, por exemplo `http://localhost:7503`. Não use o endereço do gateway. |

Sem essas variáveis a API sobe normalmente, mas o cadastro de doador responde 503.

**Cadastro do doador (`POST /doadores`, pública):**
1. O MS1 valida os dados (idade de 18 a 69 anos) e confere se o CPF já está cadastrado (409).
2. O MS1 pede ao MS4 que crie o usuário DOADOR e recebe o `usuario_id`.
3. O MS1 grava o doador com esse `usuario_id`. Se a gravação falhar, pede ao MS4 que desative o usuário criado.

O corpo da requisição **não** aceita mais `usuario_id`.

**Login do doador:** o MS4 recebe CPF e data de nascimento e pergunta ao MS1 por esta rota interna:

| Rota | Quem chama | Resposta |
| --- | --- | --- |
| `POST /internal/doadores/validar-login` | só o MS4, com o cabeçalho `x-service-key` | `{ "valido": true }` ou `{ "valido": false }` |

A resposta é a mesma para CPF inexistente, data errada ou doador inativo. Rotas `/internal` não devem ser expostas pelo gateway.

## Próximos passos
 
- Swagger, para documentar e testar as rotas pelo navegador.
- Dockerfile e `docker-compose`, para facilitar a execução (RNF-G05).
- Publicação do evento `bolsa.coletada` no RabbitMQ, após o registro da coleta (RF-05).
- Rotas das demais tabelas: doação, triagem e coleta.
- Criptografia do CPF (RNF-MS1), o que exige ajustar o tamanho da coluna e decidir como fica a busca por CPF.
- Variáveis de ambiente no Infisical (RNF-G04).