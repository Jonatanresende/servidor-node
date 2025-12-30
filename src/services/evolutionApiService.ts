import { WhatsappConnectionStatus } from '../types';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL?.replace(/\/$/, '') || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

/**
 * Verifica se a Evolution API está configurada
 */
function checkConfig(): void {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error('EVOLUTION_API_URL e EVOLUTION_API_KEY devem estar configuradas');
  }
}

/**
 * Faz uma requisição para a Evolution API
 */
async function evolutionRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  checkConfig();

  const url = `${EVOLUTION_API_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': EVOLUTION_API_KEY, // ✔️ padrão v2.3.6
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Cria uma nova instância
 */
export async function createInstance(instanceName: string): Promise<void> {
  await evolutionRequest('/instance/create', 'POST', {
    instanceName,
    integration: 'WHATSAPP-BAILEYS',
    qrcode: true,
  });
}

/**
 * Inicia a conexão de uma instância (gera QR Code via webhook)
 */
export async function connectInstance(instanceName: string): Promise<void> {
  await evolutionRequest(`/instance/connect/${instanceName}`, 'GET');
}


/**
 * Lista instâncias
 */
export async function getInstances(): Promise<any[]> {
  const response = await evolutionRequest('/instance/fetchInstances', 'GET');

  if (!Array.isArray(response)) {
    return [];
  }

  return response;
}


/**
 * Obtém QR Code da instância
 */
export async function getQRCode(instanceName: string): Promise<string | null> {
  // 1️⃣ Garante que a instância está tentando conectar
  await evolutionRequest(`/instance/connect/${instanceName}`, 'GET');

  // 2️⃣ Busca instâncias
  const instances = await evolutionRequest(`/instance/fetchInstances`, 'GET');

  if (!Array.isArray(instances)) {
    return null;
  }

  const instance = instances.find(
    (inst: any) => inst?.instance?.instanceName === instanceName
  );

  if (!instance) {
    return null;
  }

  // 3️⃣ QR Code pode vir em lugares diferentes
  const qr =
    instance.qrcode?.base64 ||
    instance.qrcode?.code ||
    instance.instance?.qrcode?.base64;

  if (!qr) {
    return null;
  }

  // 4️⃣ Normaliza retorno
  if (qr.startsWith('data:image')) {
    return qr;
  }

  return `data:image/png;base64,${qr}`;
}


/**
 * Verifica status de conexão da instância
 */
export async function checkConnection(
  instanceName: string
): Promise<WhatsappConnectionStatus> {
  try {
    const instances = await getInstances();

    const instance = instances.find(
      (inst: any) => inst.instanceName === instanceName
    );

    if (!instance) {
      return { status: 'disconnected' };
    }

    const { state, phoneNumber } = instance;

    if (state === 'open' && phoneNumber) {
      return {
        status: 'connected',
        phoneNumber,
      };
    }

    if (state === 'close') {
      return { status: 'disconnected' };
    }

    return { status: 'loading' };
  } catch (error) {
    console.error('Erro ao verificar conexão:', error);
    return { status: 'disconnected' };
  }
}

/**
 * Envia mensagem de texto
 */
export async function sendTextMessage(
  instanceName: string,
  phoneNumber: string,
  message: string
): Promise<boolean> {
  try {
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    await evolutionRequest(`/message/sendText/${instanceName}`, 'POST', {
      number: cleanPhone,
      text: message,
    });

    return true;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return false;
  }
}

/**
 * Deleta instância
 */
export async function deleteInstance(instanceName: string): Promise<void> {
  try {
    await evolutionRequest(`/instance/delete/${instanceName}`, 'DELETE');
  } catch (error) {
    console.error('Erro ao deletar instância:', error);
  }
}
