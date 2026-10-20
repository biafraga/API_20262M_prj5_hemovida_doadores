import { SetMetadata } from '@nestjs/common';
import { Perfil } from '../tipos/usuario-autenticado';

export const CHAVE_ROLES = 'perfisExigidos';

// Lista quais perfis podem usar a rota: @Roles(Perfil.ADMIN, Perfil.RECEPCAO)
export const Roles = (...perfis: Perfil[]) => SetMetadata(CHAVE_ROLES, perfis);