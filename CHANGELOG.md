# Changelog - API WhatsApp Scheduler

## [2.0.0] - 2024

### 🎉 Nova Versão - API REST Completa

Transformação do serviço de agendamento em uma API REST completa com Express.

### ✨ Novas Funcionalidades

#### API REST
- **GET /api/whatsapp/status/:barbershopId** - Verificar status da conexão WhatsApp
- **POST /api/whatsapp/connect/:barbershopId** - Iniciar conexão e gerar QR Code
- **GET /api/whatsapp/settings/:barbershopId** - Obter configurações de lembrete
- **POST /api/whatsapp/settings/:barbershopId** - Atualizar configurações de lembrete

#### Autenticação e Segurança
- Middleware de autenticação JWT
- Validação de propriedade da barbearia
- Verificação de role `dono_barbearia`

#### Persistência
- Sistema de armazenamento em arquivo JSON (MVP)
- Suporte para múltiplas barbearias
- Configurações personalizadas por barbearia

#### Scheduler Inteligente
- Processamento por barbearia
- Templates de mensagem personalizáveis
- Múltiplos horários de lembrete configuráveis
- Substituição de variáveis dinâmicas

### 🔧 Mudanças Técnicas

#### Estrutura do Projeto
```
src/
├── app.ts                    # Configuração Express
├── index.ts                  # Ponto de entrada
├── types/                    # TypeScript types
├── middleware/               # Auth middleware
├── routes/                   # Rotas da API
├── controllers/              # Lógica dos endpoints
├── services/                 # Serviços (Storage, Evolution API)
└── scheduler/               # Scheduler de lembretes
```

#### Dependências Adicionadas
- `express` - Framework web
- `cors` - CORS middleware
- `jsonwebtoken` - JWT (para futuras expansões)

#### Variáveis de Ambiente
- `PORT` - Porta do servidor (opcional, padrão: 3000)
- Removida `EVOLUTION_INSTANCE_NAME` (agora gerada dinamicamente)

### 📝 Migração da Versão Anterior

#### Código Antigo
- `src/scheduler.ts` - Scheduler único para todas as barbearias
- Configuração única via variáveis de ambiente

#### Código Novo
- `src/scheduler/reminderScheduler.ts` - Scheduler por barbearia
- Configurações por barbearia via API
- Múltiplas instâncias da Evolution API

### 🗄️ Modelo de Dados

#### BarbershopData (por barbearia)
```typescript
{
  barbershopId: string;
  status: 'connected' | 'disconnected' | 'qr_code_pending' | 'loading';
  phoneNumber?: string;
  qrCodeUrl?: string;
  messageTemplate: string;
  reminders: Array<{ value: number, unit: 'hours' | 'minutes' | 'days' }>;
}
```

### 🔄 Compatibilidade

- ✅ Mantém compatibilidade com Supabase
- ✅ Mantém compatibilidade com Evolution API
- ✅ Scheduler ainda executa a cada 5 minutos
- ⚠️ Requer autenticação JWT para todas as rotas

### 📚 Documentação

- `API_DOCUMENTATION.md` - Documentação completa da API
- `README.md` - Atualizado com novas funcionalidades
- `GUIA_MIGRACAO.md` - Guia de migração SQL (mantido)

### 🐛 Correções

- Correção na URL da Evolution API (remoção de barras duplicadas)
- Melhor tratamento de erros
- Validação de dados de entrada

### ⚠️ Breaking Changes

- **Autenticação obrigatória**: Todas as rotas agora requerem JWT
- **Configuração por barbearia**: Não há mais configuração global
- **Instâncias dinâmicas**: Cada barbearia tem sua própria instância na Evolution API

### 🚀 Próximos Passos Sugeridos

- [ ] Implementar Redis/Upstash para persistência em produção
- [ ] Adicionar webhooks do Supabase para eventos em tempo real
- [ ] Implementar rate limiting
- [ ] Adicionar logs estruturados
- [ ] Implementar testes automatizados
- [ ] Adicionar monitoramento e métricas

