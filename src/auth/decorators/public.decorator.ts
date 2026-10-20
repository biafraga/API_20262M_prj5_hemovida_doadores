import { SetMetadata } from '@nestjs/common';

export const CHAVE_PUBLICA = 'rotaPublica';

// Marca uma rota que NÃO exige token (ex.: GET /health).
export const Public = () => SetMetadata(CHAVE_PUBLICA, true);