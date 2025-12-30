export interface WhatsappConnectionStatus {
  status: 'connected' | 'disconnected' | 'qr_code_pending' | 'loading';
  phoneNumber?: string;
  qrCodeUrl?: string;
  qrCode?: string | null;
}

export interface ReminderConfig {
  value: number;
  unit: 'hours' | 'minutes' | 'days';
}

export interface WhatsappSettings {
  messageTemplate: string;
  reminders: ReminderConfig[];
}

export interface BarbershopData {
  barbershopId: string;
  status: WhatsappConnectionStatus['status'];
  phoneNumber?: string;
  qrCodeUrl?: string;
  messageTemplate: string;
  reminders: ReminderConfig[];
}

export interface JWTUser {
  userId: string;
  barbershopId: string;
  role: string;
}

export interface EvolutionWebhookPayload {
  event: string;
  instance?: string;
  instanceName?: string;
  data?: {
    qrcode?: {
      base64?: string;
      code?: string;
    };
    qr?: string;
    base64?: string;
  };
  qrcode?: {
    base64?: string;
    code?: string;
  };
  phone?: string;
  phoneNumber?: string;
}

