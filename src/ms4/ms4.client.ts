import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Tempo máximo esperando o MS4. Passou disso, respondemos 503 em vez de travar o cadastro.
const TIMEOUT_MS = 5000;

export interface UsuarioDoadorCriado {
  id: number;
  // true = o MS4 criou agora; false = o usuário já existia (cadastro repetido).
  criado: boolean;
}

// Resultado do diagnóstico da ligação com o MS4 (usado só pelo GET /health?integracao=1).
export type StatusMs4 =
  | 'ok'
  | 'nao_configurado'
  | 'inacessivel'
  | 'chave_recusada'
  | 'resposta_inesperada';

// Conversa com o MS4 (Usuários) pelas rotas INTERNAS, protegidas pelo cabeçalho x-service-key.
// Estas rotas NÃO passam pelo gateway: o endereço (MS4_BASE_URL) aponta direto para o MS4.
@Injectable()
export class Ms4Client {
  private readonly logger = new Logger(Ms4Client.name);

  constructor(private readonly config: ConfigService) {}

  // Pede ao MS4 que crie (ou devolva, se já existir) o usuário DOADOR desse CPF.
  async criarUsuarioDoador(cpf: string, nomeCompleto: string): Promise<UsuarioDoadorCriado> {
    const resposta = await this.chamar('/internal/usuarios/doador', { cpf, nomeCompleto });

    if (resposta.status === 400) {
      // O MS4 confere os dígitos verificadores do CPF; o MS1 só confere o formato.
      throw new BadRequestException('CPF inválido.');
    }
    if (!resposta.ok) {
      this.logger.error(`MS4 respondeu ${resposta.status} ao criar usuário doador`);
      throw new ServiceUnavailableException('Cadastro indisponível no momento. Tente novamente.');
    }

    const corpo = (await resposta.json()) as { id?: unknown };
    if (!Number.isInteger(corpo.id)) {
      this.logger.error('MS4 devolveu uma resposta sem id válido');
      throw new ServiceUnavailableException('Cadastro indisponível no momento. Tente novamente.');
    }
    return { id: corpo.id as number, criado: resposta.status === 201 };
  }

  // Desfaz: usado quando o MS4 criou o usuário mas o MS1 não conseguiu salvar o doador.
  // Não lança erro: se falhar, só registramos no log (sobra um usuário sem doador, sem dano).
  async desativarUsuario(usuarioId: number): Promise<void> {
    try {
      const resposta = await this.chamar(`/internal/usuarios/${usuarioId}/desativar`);
      if (!resposta.ok) {
        this.logger.error(`Não foi possível desativar o usuário ${usuarioId} (MS4: ${resposta.status})`);
      }
    } catch {
      this.logger.error(`Não foi possível desativar o usuário ${usuarioId} (MS4 fora do ar)`);
    }
  }

  // Diagnóstico da ligação com o MS4, sem criar nem alterar nada. Chama a rota interna de
  // desativar com o id 0, que nunca existe: se a chave estiver certa o MS4 responde 404;
  // se a chave estiver errada, 401. Só devolve uma palavra de status, nunca endereço ou chave.
  async verificarConexao(): Promise<StatusMs4> {
    const baseUrl = this.config.get<string>('MS4_BASE_URL');
    const chave = this.config.get<string>('SERVICE_KEY');
    if (!baseUrl || !chave) return 'nao_configurado';

    try {
      const resposta = await fetch(`${baseUrl.replace(/\/$/, '')}/internal/usuarios/0/desativar`, {
        method: 'POST',
        headers: { 'x-service-key': chave },
        signal: AbortSignal.timeout(3000),
      });
      if (resposta.status === 404) return 'ok';
      if (resposta.status === 401 || resposta.status === 403) return 'chave_recusada';
      return 'resposta_inesperada';
    } catch {
      return 'inacessivel';
    }
  }

  private async chamar(caminho: string, corpo?: object): Promise<Response> {
    const baseUrl = this.config.get<string>('MS4_BASE_URL');
    const chave = this.config.get<string>('SERVICE_KEY');
    if (!baseUrl || !chave) {
      this.logger.error('MS4_BASE_URL/SERVICE_KEY não configurados');
      throw new ServiceUnavailableException('Cadastro indisponível no momento. Tente novamente.');
    }

    try {
      return await fetch(`${baseUrl.replace(/\/$/, '')}${caminho}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-service-key': chave },
        body: corpo ? JSON.stringify(corpo) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (erro) {
      this.logger.error(`Falha ao falar com o MS4: ${erro instanceof Error ? erro.message : String(erro)}`);
      throw new ServiceUnavailableException('Cadastro indisponível no momento. Tente novamente.');
    }
  }
}