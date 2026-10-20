// Perfis que o microsserviço de usuário vai colocar no token (campo `role`).
// Se o nome de algum perfil mudar por lá, é só ajustar aqui, em um lugar só.
export const Perfil = {
  ADMIN: 'ADMIN',
  RECEPCAO: 'RECEPCAO',
  ENFERMAGEM: 'ENFERMAGEM',
  GESTOR_ESTOQUE: 'GESTOR_ESTOQUE',
  GESTOR_DEMANDA: 'GESTOR_DEMANDA',
  DOADOR: 'DOADOR',
} as const;

export type Perfil = (typeof Perfil)[keyof typeof Perfil];

export const PERFIS_VALIDOS: string[] = Object.values(Perfil);

// O que o token carrega. `sub` (de "subject") é o id do usuário no MS de usuário.
export interface UsuarioAutenticado {
  sub: number;
  role: Perfil;
}