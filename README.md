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
| `POST /doadores` | sim | sim | não | só o próprio perfil | não |
| `PUT /doadores/:id` | sim | sim | não | só o próprio | não |
| `DELETE /doadores/:id` | sim | sim | não | não | não |

## Próximos passos
 
- Swagger, para documentar e testar as rotas pelo navegador.
- Dockerfile e `docker-compose`, para facilitar a execução (RNF-G05).
- Publicação do evento `bolsa.coletada` no RabbitMQ, após o registro da coleta (RF-05).
- Rotas das demais tabelas: doação, triagem e coleta.
- Criptografia do CPF (RNF-MS1), o que exige ajustar o tamanho da coluna e decidir como fica a busca por CPF.
- Variáveis de ambiente no Infisical (RNF-G04).