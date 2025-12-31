// api/reminders/send.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import * as evolutionApiService from '../../src/services/evolutionApiService'; // Caminho ajustado

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

interface SendReminderPayload {
  barbershopId: string;
  instanceName: string;
  phoneNumber: string;
  message: string;
}

export default async function (req: VercelRequest, res: VercelResponse) {
  // 1. Validar método HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  // 2. Validar header secreto
  const xInternalKey = req.headers['x-internal-key'];
  if (!xInternalKey || xInternalKey !== INTERNAL_API_KEY) {
    console.warn('Tentativa de acesso não autorizado ao /api/reminders/send');
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  // 3. Validar payload
  const { barbershopId, instanceName, phoneNumber, message }: SendReminderPayload = req.body;

  if (!barbershopId || typeof barbershopId !== 'string' ||
      !instanceName || typeof instanceName !== 'string' ||
      !phoneNumber || typeof phoneNumber !== 'string' ||
      !message || typeof message !== 'string') {
    console.error('Payload inválido recebido em /api/reminders/send:', req.body);
    return res.status(400).json({ error: 'Payload inválido. Campos esperados: barbershopId (string), instanceName (string), phoneNumber (string), message (string).' });
  }

  try {
    // 4. Verificar conexão da instância
    const connectionStatus = await evolutionApiService.checkConnection(instanceName);
    if (connectionStatus.status !== 'connected') {
      console.error(`Instância ${instanceName} não está conectada. Status: ${connectionStatus.status}`);
      return res.status(503).json({ error: `Instância ${instanceName} não está conectada ou está em estado inválido (${connectionStatus.status}).` });
    }

    // 5. Enviar mensagem
    console.log(`[SendReminder] Tentando enviar mensagem para ${phoneNumber} na instância ${instanceName}...`);
    const success = await evolutionApiService.sendTextMessage(
      instanceName,
      phoneNumber,
      message
    );

    if (success) {
      console.log(`[SendReminder] ✅ Mensagem enviada com sucesso para ${phoneNumber} (Instância: ${instanceName}).`);
      return res.status(200).json({ message: 'Lembrete enviado com sucesso!' });
    } else {
      console.error(`[SendReminder] ❌ Falha ao enviar mensagem para ${phoneNumber} (Instância: ${instanceName}).`);
      return res.status(500).json({ error: 'Falha ao enviar o lembrete.' });
    }
  } catch (error) {
    console.error(`[SendReminder] Erro inesperado ao processar lembrete para instância ${instanceName}:`, error);
    return res.status(500).json({ error: 'Erro interno do servidor ao processar o lembrete.' });
  }
}

