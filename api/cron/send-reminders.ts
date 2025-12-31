// api/cron/send-reminders.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ReminderConfig } from '../../src/types'; // Importação estática para tipos

interface Agendamento {
  id: number;
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM
  cliente_nome: string;
  cliente_telefone: string;
  servico_nome: string;
  barbeiro_nome: string;
  barbershopId: string; // Corrigido
  reminder_sent_at: string | null;
  status?: string;
  barbearia_nome?: string;
}

/**
 * Limpa o número de telefone, removendo todos os caracteres não numéricos
 */
function limparTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

/**
 * Calcula a data/hora combinada do agendamento
 */
function calcularDataHoraAgendamento(data: string, hora: string): Date {
  const [ano, mes, dia] = data.split('-').map(Number);
  const [horas, minutos] = hora.split(':').map(Number);
  return new Date(ano, mes - 1, dia, horas, minutos);
}

/**
 * Substitui variáveis no template de mensagem
 */
function substituirVariaveis(
  template: string,
  agendamento: Agendamento
): string {
  return template
    .replace(/\{\{nome\}\}/g, agendamento.cliente_nome || 'Cliente')
    .replace(/\{\{data\}\}/g, agendamento.data)
    .replace(/\{\{hora\}\}/g, agendamento.hora)
    .replace(/\{\{barbearia\}\}/g, agendamento.barbearia_nome || 'Barbearia')
    .replace(/\{\{servico\}\}/g, agendamento.servico_nome || 'Serviço')
    .replace(/\{\{barbeiro\}\}/g, agendamento.barbeiro_nome || 'Barbeiro');
}

/**
 * Calcula o horário de envio baseado na configuração de reminder
 */
function calcularHorarioEnvio(
  dataHoraAgendamento: Date,
  reminder: ReminderConfig
): Date {
  const horarioEnvio = new Date(dataHoraAgendamento);

  switch (reminder.unit) {
    case 'minutes':
      horarioEnvio.setMinutes(horarioEnvio.getMinutes() - reminder.value);
      break;
    case 'hours':
      horarioEnvio.setHours(horarioEnvio.getHours() - reminder.value);
      break;
    case 'days':
      horarioEnvio.setDate(horarioEnvio.getDate() - reminder.value);
      break;
  }

  return horarioEnvio;
}

/**
 * Verifica se é o momento de enviar o lembrete
 */
function deveEnviarAgora(
  dataHoraAgendamento: Date,
  reminders: ReminderConfig[],
  agora: Date
): boolean {
  for (const reminder of reminders) {
    const horarioEnvio = calcularHorarioEnvio(dataHoraAgendamento, reminder);
    const diferencaMinutos = Math.abs(
      (agora.getTime() - horarioEnvio.getTime()) / (1000 * 60)
    );

    // Envia se estiver dentro de uma janela de 5 minutos do horário calculado
    if (diferencaMinutos <= 5 && horarioEnvio <= agora) {
      return true;
    }
  }

  return false;
}

/**
 * Envia mensagem de lembrete para um agendamento específico
 */
async function enviarLembrete(
  agendamento: Agendamento,
  barbershopId: string,
  messageTemplate: string
): Promise<boolean> {
  const { supabase } = await import('../../src/supabaseClient');
  const evolutionApiService = await import('../../src/services/evolutionApiService');

  const instanceName = `barbershop_${barbershopId}`;
  
  // Verificar se a instância está conectada
  const status = await evolutionApiService.checkConnection(instanceName);
  if (status.status !== 'connected') {
    console.log(
      `[Scheduler] Instância ${instanceName} não está conectada. Status: ${status.status}`
    );
    return false;
  }

  const mensagem = substituirVariaveis(messageTemplate, agendamento);
  const telefoneLimpo = limparTelefone(agendamento.cliente_telefone);

  console.log(
    `[Scheduler] Enviando lembrete para ${agendamento.cliente_nome} (${telefoneLimpo})...`
  );

  const sucesso = await evolutionApiService.sendTextMessage(
    instanceName,
    agendamento.cliente_telefone,
    mensagem
  );

  if (sucesso) {
    // Atualizar o registro marcando que o lembrete foi enviado
    const { error: updateError } = await supabase
      .from('agendamentos')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', agendamento.id);

    if (updateError) {
      console.error(
        `[Scheduler] Erro ao atualizar agendamento ${agendamento.id}:`,
        updateError
      );
    }
  } else {
    console.error(
      `[Scheduler] ❌ Falha ao enviar lembrete para agendamento ${agendamento.id}`
    );
  }

  return sucesso;
}

/**
 * Processa agendamentos de uma barbearia específica
 */
async function processarBarbearia(barbershopId: string): Promise<void> {
  const { supabase } = await import('../../src/supabaseClient');
  const storageService = await import('../../src/services/storageService');

  const barbershopData = storageService.getBarbershopData(barbershopId);
  
  if (!barbershopData) {
    return;
  }

  // Verificar se está conectado
  if (barbershopData.status !== 'connected') {
    return;
  }

  const agora = new Date();
  const dataHoje = agora.toISOString().split('T')[0];

  // Buscar agendamentos da barbearia que ainda não tiveram lembrete enviado
  const { data: agendamentos, error } = await supabase
    .from('agendamentos')
    .select('*')
    .eq('barbershopId', barbershopId) // Corrigido
    .is('reminder_sent_at', null)
    .neq('status', 'cancelado')
    .gte('data', dataHoje);

  if (error) {
    console.error(
      `[Scheduler] Erro ao buscar agendamentos para barbearia ${barbershopId}:`,
      error
    );
    return;
  }

  if (!agendamentos || agendamentos.length === 0) {
    return;
  }

  // Processar cada agendamento
  for (const agendamento of agendamentos) {
    try {
      const dataHoraAgendamento = calcularDataHoraAgendamento(
        agendamento.data,
        agendamento.hora
      );

      // Verificar se é o momento de enviar o lembrete
      if (deveEnviarAgora(dataHoraAgendamento, barbershopData.reminders, agora)) {
        await enviarLembrete(
          agendamento as Agendamento,
          barbershopId,
          barbershopData.messageTemplate
        );
      }
    } catch (error) {
      console.error(
        `[Scheduler] Erro ao processar agendamento ${agendamento.id}:`,
        error
      );
    }
  }
}

/**
 * Função principal que processa lembretes para todas as barbearias
 */
export async function sendReminders(): Promise<void> {
  const storageService = await import('../../src/services/storageService');
  console.log('[Scheduler] Iniciando verificação de agendamentos...');

  try {
    const allBarbershops = storageService.loadBarbershops();
    const barbershopIds = Object.keys(allBarbershops);

    if (barbershopIds.length === 0) {
      console.log('[Scheduler] Nenhuma barbearia configurada.');
      return;
    }

    console.log(
      `[Scheduler] Processando ${barbershopIds.length} barbearia(s)...`
    );

    // Processar cada barbearia
    for (const barbershopId of barbershopIds) {
      await processarBarbearia(barbershopId);
    }

    console.log('[Scheduler] Verificação de agendamentos concluída.');
  } catch (error) {
    console.error('[Scheduler] Erro geral na função sendReminders:', error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  if (req.method === 'GET') {
    try {
      // Chamar a função principal de envio de lembretes
      await sendReminders();
      res.status(200).send('Lembretes verificados e enviados com sucesso.');
    } catch (error) {
      console.error('Erro no handler de send-reminders:', error);
      res.status(500).send('Erro ao processar lembretes.');
    }
  } else {
    res.status(405).send('Método não permitido.');
  }
}