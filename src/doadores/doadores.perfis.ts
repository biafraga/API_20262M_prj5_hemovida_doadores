import { Perfil } from '../auth/tipos/usuario-autenticado';

// Quem pode CONSULTAR dados de qualquer doador (a equipe do hemocentro).
export const PERFIS_CONSULTA: Perfil[] = [Perfil.ADMIN, Perfil.RECEPCAO, Perfil.ENFERMAGEM];

// Quem pode CADASTRAR, ALTERAR e INATIVAR qualquer doador.
export const PERFIS_GESTAO: Perfil[] = [Perfil.ADMIN, Perfil.RECEPCAO];