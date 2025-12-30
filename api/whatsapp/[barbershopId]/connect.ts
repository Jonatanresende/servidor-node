import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as evolutionApiService from '../../../src/services/evolutionApiService';
import * as dotenv from 'dotenv';
import { getAuthenticatedUserAndBarbershopId, AuthenticationError, AuthorizationError, BarbershopNotFoundError } from '../../../src/utils/auth';

dotenv.config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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

    // 1️⃣ Buscar instâncias
    const instances = await evolutionApiService.getInstances();

    const exists = instances.some(
      (inst: any) => inst.instanceName === instanceName
    );

    // 2️⃣ Criar se não existir
    if (!exists) {
      await evolutionApiService.createInstance(instanceName);
    }

    // 🔥 3️⃣ FORÇAR geração do QR Code
    const qrCode = await evolutionApiService.getQRCode(instanceName);
    console.log('QR CODE RETORNADO:', qrCode);
    if (!qrCode) {
      return res.json({ status: 'loading' });
    }

    return res.json({
      status: 'qr_code_pending',
      qrCode,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({ error: error.message });
    } else if (error instanceof AuthorizationError) {
      res.status(403).json({ error: error.message });
    } else if (error instanceof BarbershopNotFoundError) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Erro ao conectar WhatsApp:', error);
      res.status(500).json({ error: 'Erro ao conectar WhatsApp' });
    }
  }
}
