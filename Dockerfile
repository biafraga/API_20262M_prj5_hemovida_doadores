FROM node:24-slim

WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

RUN npm install -g @infisical/cli

COPY package*.json ./

RUN npm ci

COPY . .

RUN DATABASE_URL="mysql://USUARIO:SENHA@edumysql.acesso.rj.senac.br:3306/NOME_DO_BANCO" npx prisma generate

RUN npm run build

ENV NODE_ENV=production

EXPOSE 7502

CMD ["infisical", "run", "--env=dev", "--", "npm", "run", "start:prod"]
