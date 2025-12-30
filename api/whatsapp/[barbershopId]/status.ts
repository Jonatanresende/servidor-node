import type { VercelRequest, VercelResponse } from '@vercel/node';
import { WhatsappConnectionStatus } from '../../../src/types';
import * as evolutionApiService from '../../../src/services/evolutionApiService';
import * as dotenv from 'dotenv';
import { getAuthenticatedUserAndBarbershopId, AuthenticationError, AuthorizationError, BarbershopNotFoundError } from '../../../src/utils/auth';

dotenv.config();

// Helper function to check connection status, moved from whatsappController
async function checkConnection(
  instanceName: string
): Promise<WhatsappConnectionStatus> {
  try {
    const instances = await evolutionApiService.getInstances();

    const instance = instances.find(
      (inst: any) => inst?.instanceName === instanceName
    );

    if (!instance) {
      return { status: 'disconnected' };
    }

    const { state, phoneNumber } = instance;

    if (state === 'open' && phoneNumber) {
      return {
        status: 'connected',
        phoneNumber,
      };
    }

    if (state === 'close') {
      return { status: 'disconnected' };
    }

    if (state === 'qr_code_pending') {
      return { status: 'qr_code_pending' };
    }

    return { status: 'loading' };
  } catch (error) {
    console.error('Erro ao verificar conexão:', error);
    return { status: 'disconnected' };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  try {
    const { barbershopId: routeBarbershopId } = req.query;

    if (typeof routeBarbershopId !== 'string') {
      res.status(400).json({ error: 'ID da barbearia não fornecido na URL.' });
      return;
    }

    const authenticatedUser = await getAuthenticatedUserAndBarbershopId(req);

    if (routeBarbershopId !== authenticatedUser.barbershopId) {
      res.status(403).json({ error: 'Acesso negado. Você não tem permissão para acessar esta barbearia.' });
      return;
    }

    const instanceName = `barbershop-${routeBarbershopId}`;
    const status = await checkConnection(instanceName);
    return res.json(status);

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
