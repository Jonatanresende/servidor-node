import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../src/supabaseClient';
import { EvolutionWebhookPayload } from '../../src/types';
import * as dotenv from 'dotenv';

dotenv.config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    console.log('[WEBHOOK RAW PAYLOAD]');
    console.log(JSON.stringify(req.body, null, 2));

    const payload: EvolutionWebhookPayload = req.body;

    const instanceName = payload.instance || payload.instanceName;

    if (!instanceName) {
      console.warn('[WEBHOOK] Instância não encontrada no payload');
      return res.status(400).json({ error: 'Instance name is required' });
    }

    // 🔑 Extrair barbershop_id da instância
    if (!instanceName.startsWith('barbershop-')) {
      return res.status(400).json({ error: 'Invalid instance name format' });
    }

    const barbershopId = instanceName.replace('barbershop-', '');

    console.log('[WEBHOOK] Evento recebido:', {
      event: payload.event,
      instance: instanceName,
      barbershopId,
    });

    let updateData: {
      status?: string;
      qr_code?: string | null;
      phone_number?: string | null;
      updated_at?: string;
    } = {};

    switch (payload.event) {
      case 'qrcode.updated': {
        const qrCode =
          payload.qrcode?.base64 ||
          payload.qrcode?.code ||
          payload.data?.qrcode?.base64 ||
          payload.data?.qrcode?.code ||
          payload.data?.qr ||
          payload.data?.base64;

        if (!qrCode) {
          return res.status(400).json({ error: 'QR Code not found in payload' });
        }

        const normalizedQrCode = qrCode.startsWith('data:image')
          ? qrCode
          : `data:image/png;base64,${qrCode}`;

        updateData = {
          status: 'qr_code_pending',
          qr_code: normalizedQrCode,
          phone_number: null,
        };
        break;
      }

      case 'connection.open': {
        updateData = {
          status: 'connected',
          qr_code: null,
          phone_number: payload.phone || payload.phoneNumber || null,
        };
        break;
      }

      case 'connection.close': {
        updateData = {
          status: 'disconnected',
          qr_code: null,
          phone_number: null,
        };
        break;
      }

      default:
        console.log('[WEBHOOK] Evento ignorado:', payload.event);
        return res.status(200).json({ ignored: true });
    }

    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('whatsapp_connections')
      .upsert(
        {
          barbershop_id: barbershopId,
          ...updateData,
        },
        { onConflict: 'barbershop_id' }
      );

    if (error) {
      console.error('[WEBHOOK] Erro Supabase:', error);
      return res.status(500).json({ error: 'Erro ao persistir estado da conexão' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[WEBHOOK] Erro inesperado:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
