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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  // 🔹 lógica real
  const { barbershopId } = req.query;

  return res.status(200).json({
    status: 'connected',
    barbershopId
  });
}
