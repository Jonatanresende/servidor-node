import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../src/supabaseClient';
import { EvolutionWebhookPayload } from '../../src/types';
import * as dotenv from 'dotenv';

dotenv.config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  try {
    const payload: EvolutionWebhookPayload = req.body;

    console.log('[WEBHOOK] Evento recebido:', {
      event: payload.event,
      instance: payload.instance || payload.instanceName,
      timestamp: new Date().toISOString(),
    });

    const instanceName = payload.instance || payload.instanceName;

    if (!instanceName) {
      console.warn('[WEBHOOK] Instância não encontrada no payload:', JSON.stringify(payload));
      return res.status(400).json({ error: 'Instance name is required' });
    }

    let updateData: { qr_code?: string | null; status?: string; phone_number?: string } = {};

    switch (payload.event) {
      case 'qrcode.updated': {
        console.log(`[WEBHOOK] QR Code atualizado para instância: ${instanceName}`);

        const qrCode =
          payload.qrcode?.base64 ||
          payload.qrcode?.code ||
          payload.data?.qrcode?.base64 ||
          payload.data?.qrcode?.code ||
          payload.data?.qr ||
          payload.data?.base64;

        if (qrCode) {
          let normalizedQrCode = qrCode;
          if (!normalizedQrCode.startsWith('data:image')) {
            normalizedQrCode = `data:image/png;base64,${qrCode}`;
          }
          updateData = { qr_code: normalizedQrCode, status: 'qr_code_pending' };
          console.log(`[WEBHOOK] QR Code salvo para instância: ${instanceName}`);
        } else {
          console.warn(`[WEBHOOK] QR Code vazio para instância: ${instanceName}`, JSON.stringify(payload));
          return res.status(400).json({ error: 'QR Code is required for qrcode.updated event' });
        }
        break;
      }

      case 'connection.open': {
        console.log(`[WEBHOOK] Conexão aberta para instância: ${instanceName}`);
        updateData = { qr_code: null, status: 'connected', phone_number: payload.phone || payload.phoneNumber };
        console.log(`[WEBHOOK] Status atualizado para 'connected' para instância: ${instanceName}`);
        break;
      }

      case 'connection.close': {
        console.log(`[WEBHOOK] Conexão fechada para instância: ${instanceName}`);
        updateData = { qr_code: null, status: 'disconnected' };
        console.log(`[WEBHOOK] Status atualizado para 'disconnected' para instância: ${instanceName}`);
        break;
      }

      default:
        console.log(`[WEBHOOK] Evento não tratado: ${payload.event} para instância: ${instanceName}`);
        break;
    }

    if (Object.keys(updateData).length > 0) {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .upsert({ instance_name: instanceName, ...updateData }, { onConflict: 'instance_name' });

      if (error) {
        console.error('Erro ao atualizar Supabase:', error);
        return res.status(500).json({ error: 'Erro interno ao persistir dados do webhook' });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[WEBHOOK] Erro ao processar webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

