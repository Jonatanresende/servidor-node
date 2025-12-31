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

  // 🔹 Método permitido
  if (req.method === 'GET') {
    // 🔹 lógica real com imports dinâmicos
    try {
      const { barbershopId } = req.query;

      if (typeof barbershopId !== 'string') {
        return res.status(400).json({ error: 'ID da barbearia não fornecido na URL.' });
      }

      const { getAuthenticatedUserAndBarbershopId, AuthenticationError, AuthorizationError, BarbershopNotFoundError } = await import('../../../src/utils/auth');
      const evolutionApiService = await import('../../../src/services/evolutionApiService');

      const authenticatedUser = await getAuthenticatedUserAndBarbershopId(req);

      if (barbershopId !== authenticatedUser.barbershopId) {
        console.warn(`Tentativa de acesso não autorizado: User ID ${authenticatedUser.userId} tentou acessar barbershopId ${barbershopId}.`);
        return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para acessar esta barbearia.' });
      }

      const instanceName = `barbershop-${barbershopId}`;
      const status = await evolutionApiService.checkConnection(instanceName);
      return res.status(200).json(status);

    } catch (error) {
      const { AuthenticationError, AuthorizationError, BarbershopNotFoundError } = await import('../../../src/utils/auth');
      if (error instanceof AuthenticationError) {
        console.error('Erro de autenticação:', error.message);
        return res.status(401).json({ error: error.message });
      } else if (error instanceof AuthorizationError) {
        console.error('Erro de autorização:', error.message);
        return res.status(403).json({ error: error.message });
      } else if (error instanceof BarbershopNotFoundError) {
        console.error('Barbearia não encontrada:', error.message);
        return res.status(400).json({ error: error.message });
      } else {
        console.error('Erro inesperado em /api/whatsapp/[barbershopId]/status.ts:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
    }
  } else {
    return res.status(405).json({ error: 'Método não permitido.' });
  }
}