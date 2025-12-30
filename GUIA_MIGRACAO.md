# 📘 Guia: Como Executar a Migração SQL no Supabase

Este guia explica passo a passo como adicionar a coluna `reminder_sent_at` na tabela `agendamentos` do Supabase.

## 🎯 Objetivo

Adicionar uma nova coluna `reminder_sent_at` na tabela `agendamentos` para rastrear quando os lembretes foram enviados.

## 📝 Passo a Passo

### 1. Acesse o Supabase Dashboard

1. Abra seu navegador e acesse [https://supabase.com](https://supabase.com)
2. Faça login na sua conta
3. Selecione o projeto onde está a tabela `agendamentos`

### 2. Abra o SQL Editor

1. No menu lateral esquerdo, clique em **"SQL Editor"** (ou "Editor SQL")
2. Você verá uma interface com uma área de texto para escrever queries SQL

### 3. Copie o SQL da Migração

Abra o arquivo `migrations/add_reminder_sent_at.sql` e copie todo o conteúdo:

```sql
-- Migração: Adicionar coluna reminder_sent_at na tabela agendamentos
-- Data: 2024
-- Descrição: Adiciona campo para rastrear quando o lembrete foi enviado

ALTER TABLE public.agendamentos
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Comentário na coluna para documentação
COMMENT ON COLUMN public.agendamentos.reminder_sent_at IS 
'Timestamp que indica quando o lembrete foi enviado via WhatsApp. NULL significa que o lembrete ainda não foi enviado.';
```

**OU** copie apenas a parte essencial (mais simples):

```sql
ALTER TABLE public.agendamentos
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
```

### 4. Cole o SQL no Editor

1. Cole o SQL copiado na área de texto do SQL Editor
2. Verifique se o SQL está correto

### 5. Execute a Query

1. Clique no botão **"Run"** (ou "Executar") no canto superior direito
2. Ou pressione `Ctrl + Enter` (Windows/Linux) ou `Cmd + Enter` (Mac)

### 6. Verifique o Resultado

Você deve ver uma mensagem de sucesso, algo como:
- ✅ "Success. No rows returned"
- ✅ "Query executed successfully"

### 7. Verifique se a Coluna Foi Criada (Opcional)

Para confirmar que a coluna foi adicionada, execute esta query:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'agendamentos'
AND column_name = 'reminder_sent_at';
```

Você deve ver a coluna `reminder_sent_at` listada com o tipo `timestamp with time zone`.

## 🖼️ Visualização do Processo

```
Supabase Dashboard
    ↓
SQL Editor (menu lateral)
    ↓
Cole o SQL da migração
    ↓
Clique em "Run" ou Ctrl+Enter
    ↓
✅ Coluna criada com sucesso!
```

## ⚠️ Possíveis Erros e Soluções

### Erro: "relation 'agendamentos' does not exist"
- **Causa**: A tabela não existe ou está em outro schema
- **Solução**: Verifique se o nome da tabela está correto. Se estiver em outro schema, use `schema.tabela`

### Erro: "permission denied"
- **Causa**: Você não tem permissão para alterar a tabela
- **Solução**: Certifique-se de estar usando uma conta com permissões de administrador ou use a Service Role Key

### Erro: "column already exists"
- **Causa**: A coluna já foi criada anteriormente
- **Solução**: Isso não é um problema! O `IF NOT EXISTS` previne esse erro. A migração já foi executada.

## ✅ Verificação Final

Após executar a migração, você pode verificar na interface do Supabase:

1. Vá em **"Table Editor"** (Editor de Tabelas)
2. Selecione a tabela `agendamentos`
3. Você deve ver a nova coluna `reminder_sent_at` na lista de colunas

## 🎉 Pronto!

Agora a tabela `agendamentos` tem a coluna `reminder_sent_at` e o serviço de agendamento pode funcionar corretamente!

---

**Dica**: Se você já executou a migração antes, não há problema em executá-la novamente. O `IF NOT EXISTS` garante que não haverá erro se a coluna já existir.

