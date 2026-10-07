import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client';

// Intercepta erros conhecidos do Prisma e devolve uma resposta HTTP legível.
// Sem isso, um CPF duplicado viraria um 500.
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(erro: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const resposta = host.switchToHttp().getResponse<Response>();
    const { status, mensagem } = this.traduzir(erro);

    // A mensagem técnica completa vai só para o log do servidor.
    this.logger.warn(`Prisma ${erro.code}: ${erro.message.split('\n').pop()}`);

    // O cliente recebe só o nome padrão do status (CONFLICT, NOT_FOUND...),
    // sem o código interno do Prisma, que revelaria a tecnologia usada.
    resposta.status(status).json({ statusCode: status, message: mensagem, error: HttpStatus[status] });
  }

  private traduzir(erro: Prisma.PrismaClientKnownRequestError): {
    status: number;
    mensagem: string;
  } {
    switch (erro.code) {
      case 'P2002':
        return { status: HttpStatus.CONFLICT, mensagem: 'Já existe um registro cadastrado com esse valor.' };
      case 'P2003':
        return { status: HttpStatus.BAD_REQUEST, mensagem: 'Referência inválida: o registro relacionado não existe.' };
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, mensagem: 'Registro não encontrado.' };
      default:
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, mensagem: 'Erro interno ao acessar o banco de dados.' };
    }
  }
}