import type { VercelRequest } from '@vercel/node';
import { supabase } from '../supabaseClient';

export class AuthenticationError extends Error {
  constructor(message: string = 'Token de autenticação não fornecido ou inválido') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Acesso negado. Role do usuário insuficiente.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class BarbershopNotFoundError extends Error {
  constructor(message: string = 'Barbearia não encontrada ou não associada ao usuário.') {
    super(message);
    this.name = 'BarbershopNotFoundError';
  }
}

interface AuthenticatedUser {
  userId: string;
  barbershopId: string;
  role: string;
}

export async function getAuthenticatedUserAndBarbershopId(req: VercelRequest): Promise<AuthenticatedUser> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Token de autenticação não fornecido');
  }

  const token = authHeader.substring(7);

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new AuthenticationError('Token inválido ou expirado');
  }

  const role = user.user_metadata?.role;

  if (role !== 'barbearia') {
    throw new AuthorizationError('Acesso negado. Apenas donos de barbearia podem acessar.');
  }

  const { data: barbeariaData, error: barbeariaError } = await supabase
    .from('barbearias')
    .select('id')
    .eq('dono_id', user.id)
    .single();

  if (barbeariaError || !barbeariaData) {
    console.error('Erro ao buscar barbearia:', barbeariaError?.message);
    throw new BarbershopNotFoundError('Barbearia não encontrada ou não associada ao usuário.');
  }

  return {
    userId: user.id,
    barbershopId: barbeariaData.id,
    role: role,
  };
}
