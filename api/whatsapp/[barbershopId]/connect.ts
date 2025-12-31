import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 🔹 CORS headers (garantia)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,DELETE,OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-internal-key'
  );

  // 🔹 PRE-FLIGHT (ESSENCIAL)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { barbershopId: routeBarbershopId } = req.query;

      if (typeof routeBarbershopId !== 'string') {
        res.status(400).json({ error: 'ID da barbearia não fornecido na URL.' });
        return;
      }

      const { getAuthenticatedUserAndBarbershopId, AuthenticationError, AuthorizationError, BarbershopNotFoundError } = await import('../../../src/utils/auth');
      const evolutionApiService = await import('../../../src/services/evolutionApiService');
      const dotenv = await import('dotenv');
      dotenv.config();

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
      const { AuthenticationError, AuthorizationError, BarbershopNotFoundError } = await import('../../../src/utils/auth');
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
  } else {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }
}