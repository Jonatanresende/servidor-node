-- Migração: Adicionar coluna reminder_sent_at na tabela agendamentos
-- Data: 2024
-- Descrição: Adiciona campo para rastrear quando o lembrete foi enviado

ALTER TABLE public.agendamentos
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Comentário na coluna para documentação
COMMENT ON COLUMN public.agendamentos.reminder_sent_at IS 
'Timestamp que indica quando o lembrete foi enviado via WhatsApp. NULL significa que o lembrete ainda não foi enviado.';

