# Serviço de Agendamento - WhatsApp Reminders

Serviço Node.js que busca agendamentos no Supabase e envia lembretes automáticos via WhatsApp usando a Evolution API.

## 🚀 Funcionalidades

- Busca agendamentos no Supabase que ocorrerão nas próximas 2 horas
- Envia lembretes automáticos via WhatsApp usando Evolution API
- Executa verificação a cada 5 minutos
- Marca agendamentos com lembrete enviado para evitar duplicatas

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta no Supabase com tabela `agendamentos`
- Evolution API rodando e acessível
- Variáveis de ambiente configuradas

## 🛠️ Instalação

1. Clone o repositório ou navegue até a pasta do projeto

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
   - Copie o arquivo `env.template` para `.env`
   - Preencha todas as variáveis necessárias

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Evolution API Configuration
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=your_evolution_api_key_here
EVOLUTION_INSTANCE_NAME=your_instance_name_here
```

### Migração do Banco de Dados

Antes de executar o serviço, execute a migração SQL no Supabase para adicionar a coluna `reminder_sent_at`.

**📘 Guia Completo**: Veja o arquivo `GUIA_MIGRACAO.md` para instruções detalhadas passo a passo.

**Resumo rápido:**

1. Acesse o Supabase Dashboard → Selecione seu projeto
2. Vá em **SQL Editor** (menu lateral)
3. Cole e execute o seguinte SQL:

```sql
ALTER TABLE public.agendamentos
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
```

4. Clique em **"Run"** ou pressione `Ctrl + Enter`

O arquivo completo da migração está em `migrations/add_reminder_sent_at.sql`.

## 🗄️ Estrutura da Tabela

A tabela `agendamentos` deve ter os seguintes campos:

- `id` (número)
- `data` (string, formato YYYY-MM-DD)
- `hora` (string, formato HH:MM)
- `cliente_nome` (string)
- `cliente_telefone` (string)
- `servico_nome` (string)
- `barbeiro_nome` (string)
- `barbearia_id` (número)
- `reminder_sent_at` (timestamp, nullable)
- `status` (string, opcional)

## 🚀 Executando

### Modo Desenvolvimento

```bash
npm run dev
```

### Modo Produção

1. Compile o TypeScript:
```bash
npm run build
```

2. Execute o serviço:
```bash
npm start
```

## 📝 Como Funciona

1. O serviço inicia e executa uma verificação imediata
2. A cada 5 minutos, o scheduler executa a função `sendReminders()`
3. A função busca agendamentos que:
   - Ocorrerão entre agora e 2 horas no futuro
   - Ainda não tiveram lembrete enviado (`reminder_sent_at IS NULL`)
   - Não estão cancelados (`status != 'cancelado'`)
4. Para cada agendamento encontrado:
   - Limpa o número de telefone (remove caracteres não numéricos)
   - Constrói a mensagem de lembrete
   - Envia via Evolution API
   - Se bem-sucedido, atualiza `reminder_sent_at` com o timestamp atual

## 📁 Estrutura do Projeto

```
servidor-node/
├── src/
│   ├── index.ts              # Ponto de entrada, configuração do cron
│   ├── scheduler.ts          # Lógica principal de busca e envio
│   └── supabaseClient.ts     # Cliente Supabase
├── migrations/
│   └── add_reminder_sent_at.sql
├── package.json
├── tsconfig.json
├── env.template
└── README.md
```

## 🔍 Logs

O serviço gera logs detalhados sobre:
- Inicialização do serviço
- Execução de verificações
- Agendamentos encontrados
- Envio de mensagens (sucesso/falha)
- Erros e exceções

## ⚠️ Observações

- O serviço usa `SUPABASE_SERVICE_ROLE_KEY` para ignorar RLS (Row Level Security)
- Certifique-se de que a Evolution API está acessível e configurada corretamente
- O número de telefone é limpo automaticamente (remove caracteres não numéricos)
- Agendamentos são marcados como enviados mesmo se houver erro na atualização do banco

## 🐛 Troubleshooting

- **Erro de conexão com Supabase**: Verifique `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
- **Erro ao enviar mensagem**: Verifique `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `EVOLUTION_INSTANCE_NAME`
- **Nenhum agendamento encontrado**: Verifique se há agendamentos na janela de 2 horas e se `reminder_sent_at` está NULL
- **Mensagens não estão sendo enviadas**: Verifique se a Evolution API está rodando e se a instância está conectada ao WhatsApp
- **Erro de timezone**: Certifique-se de que o servidor e o banco de dados estão usando o mesmo timezone

## 🔐 Segurança

- **Nunca commite o arquivo `.env`** - Ele contém credenciais sensíveis
- Use `SUPABASE_SERVICE_ROLE_KEY` apenas em ambientes seguros (servidor backend)
- Mantenha as chaves de API em segredo e rotacione-as periodicamente
- Considere usar variáveis de ambiente do sistema operacional em produção

## 📱 Formato de Telefone

O serviço aceita números de telefone em qualquer formato e os limpa automaticamente, removendo caracteres não numéricos. 

**Exemplos de formatos aceitos:**
- `+55 11 98765-4321`
- `(11) 98765-4321`
- `11987654321`
- `55 11 98765 4321`

Todos serão convertidos para: `5511987654321` (DDI + DDD + Número)

## 🏭 Executando em Produção

### Usando PM2 (Recomendado)

1. Instale o PM2 globalmente:
```bash
npm install -g pm2
```

2. Compile o projeto:
```bash
npm run build
```

3. Inicie com PM2:
```bash
pm2 start dist/index.js --name whatsapp-scheduler
```

4. Configure para iniciar automaticamente:
```bash
pm2 startup
pm2 save
```

5. Monitore os logs:
```bash
pm2 logs whatsapp-scheduler
```

### Usando Docker (Opcional)

Crie um `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
```

## 📊 Monitoramento

O serviço gera logs estruturados que podem ser monitorados:

- **Logs de sucesso**: Agendamentos processados com sucesso
- **Logs de erro**: Falhas na comunicação com APIs
- **Logs de execução**: Início e fim de cada verificação

Exemplo de log de sucesso:
```
[Scheduler] ✅ Lembrete enviado e registrado para agendamento 123
```

## 🔄 Resetando Lembretes Enviados

Se precisar reenviar lembretes para agendamentos já processados, você pode resetar o campo `reminder_sent_at`:

```sql
-- Resetar todos os lembretes
UPDATE public.agendamentos
SET reminder_sent_at = NULL
WHERE reminder_sent_at IS NOT NULL;

-- Resetar lembretes de um agendamento específico
UPDATE public.agendamentos
SET reminder_sent_at = NULL
WHERE id = 123;
```

## ⏰ Timezone e Horários

- O serviço usa o timezone do servidor onde está rodando
- Certifique-se de que o servidor está configurado com o timezone correto
- A janela de 2 horas é calculada com base no horário atual do servidor
- Agendamentos são comparados considerando data e hora combinadas

## 📝 Exemplo de Mensagem Enviada

```
Olá João Silva! 👋

Este é um lembrete do seu agendamento:

📅 Data: 2024-01-15
🕐 Hora: 14:30
💇 Serviço: Corte + Barba
👨‍💼 Barbeiro: Carlos Santos

Esperamos você! 🎉
```

## 🔧 Personalização

### Alterar Intervalo de Verificação

Edite `src/index.ts` e modifique o cron schedule:

```typescript
// A cada 5 minutos (padrão)
cron.schedule('*/5 * * * *', ...)

// A cada 10 minutos
cron.schedule('*/10 * * * *', ...)

// A cada hora
cron.schedule('0 * * * *', ...)
```

### Alterar Janela de Tempo

Edite `src/scheduler.ts` e modifique a constante:

```typescript
// 2 horas (padrão)
const duasHorasDepois = new Date(agora.getTime() + 2 * 60 * 60 * 1000);

// 1 hora
const umaHoraDepois = new Date(agora.getTime() + 1 * 60 * 60 * 1000);
```

### Personalizar Mensagem

Edite a função `construirMensagemLembrete` em `src/scheduler.ts` para alterar o formato da mensagem.

## 📚 Recursos Adicionais

- [Documentação do Supabase](https://supabase.com/docs)
- [Documentação da Evolution API](https://doc.evolution-api.com/)
- [Documentação do node-cron](https://www.npmjs.com/package/node-cron)

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

ISC

## 👤 Autor

Criado para automatizar o envio de lembretes de agendamentos via WhatsApp.

---

**Nota**: Este serviço requer que a Evolution API esteja rodando e configurada corretamente. Certifique-se de que a instância do WhatsApp está conectada antes de iniciar o scheduler.

