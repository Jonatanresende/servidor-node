import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { supabase } from '../../src/supabaseClient'; // Adjust path as needed
import { JWTUser } from '../../src/types'; // Adjust path as needed

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SUPABASE_URL: string;
      SUPABASE_SERVICE_ROLE_KEY: string;
      JWT_SECRET: string; // Assuming you'll add a JWT_SECRET for signing tokens if needed
    }
  }
}

interface AuthenticatedRequest extends VercelRequest {
  user?: JWTUser;
}

export async function authenticateJWT(req: AuthenticatedRequest, res: VercelResponse): Promise<void | Response> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação não fornecido' });
    return;
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  // 1. Verificar o token com o Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
    return;
  }

  const role = user.user_metadata?.role;

  // 2. Verificar a role
  if (role !== 'barbearia') {
    res.status(403).json({ error: 'Acesso negado. Apenas donos de barbearia podem acessar.' });
    return;
  }

  // 3. Buscar o ID da barbearia associada ao dono (dono_id = user.id)
  const { data: barbeariaData, error: barbeariaError } = await supabase
    .from('barbearias')
    .select('id')
    .eq('dono_id', user.id)
    .single();

  if (barbeariaError || !barbeariaData) {
    console.error('Erro ao buscar barbearia:', barbeariaError?.message);
    res.status(400).json({ error: 'Barbearia não encontrada ou não associada ao usuário.' });
    return;
  }

  // 4. Adicionar informações do usuário à requisição
  req.user = {
    userId: user.id,
    barbershopId: barbeariaData.id,
    role: role,
  };
}

export function validateBarbershopOwnership(
  req: AuthenticatedRequest,
  res: VercelResponse,
  barbershopId: string
): void | Response {
  const userBarbershopId = req.user?.barbershopId;

  if (!userBarbershopId) {
    res.status(401).json({ error: 'Usuário não autenticado' });
    return;
  }

  if (barbershopId !== userBarbershopId) {
    res.status(403).json({ error: 'Acesso negado. Você não tem permissão para acessar esta barbearia.' });
    return;
  }
}

