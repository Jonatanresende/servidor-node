import { supabase } from './supabaseClient';

interface Agendamento {
  id: number;
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM
  cliente_nome: string;
  cliente_telefone: string;
  servico_nome: string;
  barbeiro_nome: string;
  barbearia_id: number;
  reminder_sent_at: string | null;
  status?: string;
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
 * Envia mensagem via Evolution API
 */
async function enviarMensagemWhatsApp(
  telefone: string,
  mensagem: string
): Promise<boolean> {
  const evolutionApiUrl = process.env.EVOLUTION_API_URL;
  const evolutionApiKey = process.env.EVOLUTION_API_KEY;
  const evolutionInstanceName = process.env.EVOLUTION_INSTANCE_NAME;

  if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstanceName) {
    throw new Error(
      'EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME devem estar definidas'
    );
  }

  // Remove barra final da URL se existir para evitar barras duplicadas
  const baseUrl = evolutionApiUrl.replace(/\/$/, '');
  const url = `${baseUrl}/message/sendText/${evolutionInstanceName}`;
  const telefoneLimpo = limparTelefone(telefone);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        number: telefoneLimpo,
        text: mensagem,
      }),
    });

    return response.ok || response.status === 200 || response.status === 201;
  } catch (error) {
    console.error('Erro ao enviar mensagem via Evolution API:', error);
    return false;
  }
}

/**
 * Constrói a mensagem de lembrete
 */
function construirMensagemLembrete(agendamento: Agendamento): string {
  return `Olá ${agendamento.cliente_nome}! 👋

Este é um lembrete do seu agendamento:

📅 Data: ${agendamento.data}
🕐 Hora: ${agendamento.hora}
💇 Serviço: ${agendamento.servico_nome}
👨‍💼 Barbeiro: ${agendamento.barbeiro_nome}

Esperamos você! 🎉`;
}

/**
 * Função principal que busca agendamentos e envia lembretes
 */
export async function sendReminders(): Promise<void> {
  console.log('[Scheduler] Iniciando verificação de agendamentos...');

  try {
    const agora = new Date();
    const duasHorasDepois = new Date(agora.getTime() + 2 * 60 * 60 * 1000); // +2 horas

    // Buscar agendamentos que ainda não tiveram lembrete enviado
    // Filtramos por data >= hoje e status != 'cancelado' (inclui null)
    const dataHoje = agora.toISOString().split('T')[0];
    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select('*')
      .is('reminder_sent_at', null)
      .neq('status', 'cancelado')
      .gte('data', dataHoje);

    if (error) {
      console.error('[Scheduler] Erro ao buscar agendamentos:', error);
      return;
    }

    if (!agendamentos || agendamentos.length === 0) {
      console.log('[Scheduler] Nenhum agendamento encontrado para enviar lembrete.');
      return;
    }

    console.log(`[Scheduler] ${agendamentos.length} agendamento(s) encontrado(s).`);

    // Filtrar agendamentos que estão dentro da janela de 2 horas
    const agendamentosParaLembrete: Agendamento[] = [];

    for (const agendamento of agendamentos) {
      const dataHoraAgendamento = calcularDataHoraAgendamento(
        agendamento.data,
        agendamento.hora
      );

      if (
        dataHoraAgendamento >= agora &&
        dataHoraAgendamento <= duasHorasDepois
      ) {
        agendamentosParaLembrete.push(agendamento as Agendamento);
      }
    }

    if (agendamentosParaLembrete.length === 0) {
      console.log('[Scheduler] Nenhum agendamento dentro da janela de 2 horas.');
      return;
    }

    console.log(
      `[Scheduler] ${agendamentosParaLembrete.length} agendamento(s) dentro da janela de tempo.`
    );

    // Enviar lembretes
    for (const agendamento of agendamentosParaLembrete) {
      try {
        const mensagem = construirMensagemLembrete(agendamento);
        const telefoneLimpo = limparTelefone(agendamento.cliente_telefone);

        console.log(
          `[Scheduler] Enviando lembrete para ${agendamento.cliente_nome} (${telefoneLimpo})...`
        );

        const sucesso = await enviarMensagemWhatsApp(
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
          } else {
            console.log(
              `[Scheduler] ✅ Lembrete enviado e registrado para agendamento ${agendamento.id}`
            );
          }
        } else {
          console.error(
            `[Scheduler] ❌ Falha ao enviar lembrete para agendamento ${agendamento.id}`
          );
        }
      } catch (error) {
        console.error(
          `[Scheduler] Erro ao processar agendamento ${agendamento.id}:`,
          error
        );
      }
    }

    console.log('[Scheduler] Verificação de agendamentos concluída.');
  } catch (error) {
    console.error('[Scheduler] Erro geral na função sendReminders:', error);
  }
}

