// api/webhook/evolution.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_utils/cors';

export default async function (req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

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