import * as fs from 'fs';
import * as path from 'path';
import { BarbershopData, WhatsappSettings, ReminderConfig } from '../types';

const STORAGE_FILE = path.join(process.cwd(), 'data', 'barbershops.json');
const DEFAULT_MESSAGE_TEMPLATE = 'Olá {{nome}} 👋\nSeu horário está marcado para {{data}} às {{hora}} na {{barbearia}}.\nQualquer imprevisto é só avisar 😉';
const DEFAULT_REMINDERS: ReminderConfig[] = [{ value: 24, unit: 'hours' }];

/**
 * Garante que o diretório data existe
 */
function ensureDataDirectory(): void {
  const dataDir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Carrega todos os dados das barbearias do arquivo
 */
export function loadBarbershops(): Record<string, BarbershopData> {
  ensureDataDirectory();
  
  if (!fs.existsSync(STORAGE_FILE)) {
    return {};
  }

  try {
    const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao carregar dados das barbearias:', error);
    return {};
  }
}

/**
 * Salva os dados das barbearias no arquivo
 */
export function saveBarbershops(data: Record<string, BarbershopData>): void {
  ensureDataDirectory();
  
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Erro ao salvar dados das barbearias:', error);
    throw error;
  }
}

/**
 * Obtém os dados de uma barbearia específica
 */
export function getBarbershopData(barbershopId: string): BarbershopData | null {
  const data = loadBarbershops();
  return data[barbershopId] || null;
}

/**
 * Cria ou atualiza os dados de uma barbearia
 */
export function setBarbershopData(barbershopData: BarbershopData): void {
  const data = loadBarbershops();
  data[barbershopData.barbershopId] = barbershopData;
  saveBarbershops(data);
}

/**
 * Inicializa dados padrão para uma barbearia se não existir
 */
export function initializeBarbershop(barbershopId: string): BarbershopData {
  const existing = getBarbershopData(barbershopId);
  
  if (existing) {
    return existing;
  }

  const newData: BarbershopData = {
    barbershopId,
    status: 'disconnected',
    messageTemplate: DEFAULT_MESSAGE_TEMPLATE,
    reminders: DEFAULT_REMINDERS,
  };

  setBarbershopData(newData);
  return newData;
}

/**
 * Atualiza o status da conexão de uma barbearia
 */
export function updateConnectionStatus(
  barbershopId: string,
  status: BarbershopData['status'],
  phoneNumber?: string,
  qrCodeUrl?: string
): void {
  const data = initializeBarbershop(barbershopId);
  data.status = status;
  
  if (phoneNumber) {
    data.phoneNumber = phoneNumber;
  }
  
  if (qrCodeUrl) {
    data.qrCodeUrl = qrCodeUrl;
  } else if (status !== 'qr_code_pending') {
    delete data.qrCodeUrl;
  }

  setBarbershopData(data);
}

/**
 * Atualiza as configurações de lembrete de uma barbearia
 */
export function updateSettings(
  barbershopId: string,
  settings: WhatsappSettings
): BarbershopData {
  const data = initializeBarbershop(barbershopId);
  data.messageTemplate = settings.messageTemplate;
  data.reminders = settings.reminders;
  setBarbershopData(data);
  return data;
}

/**
 * Obtém as configurações de uma barbearia
 */
export function getSettings(barbershopId: string): WhatsappSettings {
  const data = initializeBarbershop(barbershopId);
  return {
    messageTemplate: data.messageTemplate,
    reminders: data.reminders,
  };
}

