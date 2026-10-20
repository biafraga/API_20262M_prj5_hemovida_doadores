// Gera um token de teste, ENQUANTO o microsserviço de usuário não existe.
// Uso:  npm run token -- ADMIN 1      (perfil e id do usuário)
// Perfis: ADMIN, RECEPCAO, ENFERMAGEM, GESTOR_ESTOQUE, GESTOR_DEMANDA, DOADOR
require('dotenv').config({ quiet: true });
const { JwtService } = require('@nestjs/jwt');

const [perfil = 'ADMIN', id = '1'] = process.argv.slice(2);

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET não encontrado. Confira o seu .env');
  process.exit(1);
}

const jwt = new JwtService({ secret: process.env.JWT_SECRET });
const token = jwt.sign(
  { sub: Number(id), role: perfil },
  { expiresIn: process.env.JWT_EXPIRES_IN || '1h', algorithm: 'HS256' },
);

console.log(token);