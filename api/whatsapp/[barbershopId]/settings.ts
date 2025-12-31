import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as storageService from '../../../src/services/storageService';
import * as dotenv from 'dotenv';
import { getAuthenticatedUserAndBarbershopId, AuthenticationError, AuthorizationError, BarbershopNotFoundError } from '../../../src/utils/auth';
import { applyCors } from '../../../_utils/cors';

dotenv.config();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  try {
    const { barbershopId: routeBarbershopId } = req.query;

    if (typeof routeBarbershopId !== 'string') {
      res.status(400).json({ error: 'ID da barbearia inválido.' });
      return;
    }

    const authenticatedUser = await getAuthenticatedUserAndBarbershopId(req);

    if (routeBarbershopId !== authenticatedUser.barbershopId) {
      res.status(403).json({ error: 'Acesso negado. Você não tem permissão para acessar esta barbearia.' });
      return;
    }

    const settings = storageService.getSettings(routeBarbershopId);

    return res.json(settings);

  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({ error: error.message });
    } else if (error instanceof AuthorizationError) {
      res.status(403).json({ error: error.message });
    } else if (error instanceof BarbershopNotFoundError) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Erro inesperado:', error);
      res.status(500).json({ error: 'Erro interno do servidor.' });
    }
  }
}
