import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../src/supabaseClient';
import { JWTUser, WhatsappSettings } from '../../../src/types';
import * as storageService from '../../../src/services/storageService';
import * as dotenv from 'dotenv';

dotenv.config();

async function authenticateAndAuthorize(req: VercelRequest, res: VercelResponse): Promise<JWTUser | null> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token de autenticação não fornecido' });
      return null;
    }

    const token = authHeader.substring(7);

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Token inválido ou expirado' });
      return null;
    }

    const role = user.user_metadata?.role;

    if (role !== 'barbearia') {
      res.status(403).json({ error: 'Acesso negado. Apenas donos de barbearia podem acessar.' });
      return null;
    }

    const { data: barbeariaData, error: barbeariaError } = await supabase
      .from('barbearias')
      .select('id')
      .eq('dono_id', user.id)
      .single();

    if (barbeariaError || !barbeariaData) {
      console.error('Erro ao buscar barbearia:', barbeariaError?.message);
      res.status(400).json({ error: 'Barbearia não encontrada ou não associada ao usuário.' });
      return null;
    }

    const userBarbershopId = barbeariaData.id;
    const { barbershopId } = req.query;

    if (!barbershopId || typeof barbershopId !== 'string') {
      res.status(400).json({ error: 'ID da barbearia não fornecido na URL.' });
      return null;
    }

    if (barbershopId !== userBarbershopId) {
      res.status(403).json({ error: 'Acesso negado. Você não tem permissão para acessar esta barbearia.' });
      return null;
    }

    return {
      userId: user.id,
      barbershopId: userBarbershopId,
      role: role,
    };

  } catch (error) {
    console.error('Erro na autenticação/autorização:', error);
    res.status(500).json({ error: 'Erro interno na autenticação/autorização' });
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const user = await authenticateAndAuthorize(req, res);
  if (!user) {
    return; // Response already sent by authenticateAndAuthorize
  }

  const { barbershopId } = req.query;

  if (typeof barbershopId !== 'string') {
    res.status(400).json({ error: 'ID da barbearia inválido.' });
    return;
  }

  const settings: WhatsappSettings = req.body;

  const updated = storageService.updateSettings(barbershopId, settings);

  return res.status(200).json(updated);
}

