import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function (req: VercelRequest, res: VercelResponse) {
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
    console.log('Webhook Evolution API recebido:');
    console.log(JSON.stringify(req.body, null, 2));

    // Preparar para futuras validações, mas sem alterar o banco por enquanto
    // const payload = req.body;
    // if (payload.event === 'message') {
    //   // Lógica para processar mensagens, se necessário
    // }

    res.status(200).send('Webhook recebido com sucesso!');
  } else {
    res.status(405).send('Método não permitido.');
  }
}