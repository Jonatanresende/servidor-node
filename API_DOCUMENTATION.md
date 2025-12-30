# 📚 Documentação da API - WhatsApp Scheduler

API REST para gerenciamento de conexões WhatsApp e envio de lembretes de agendamento.

## 🔗 Base URL

```
https://your-node-scheduler-api.com/api/whatsapp
```

## 🔐 Autenticação

Todas as requisições requerem autenticação JWT no header:

```
Authorization: Bearer <token>
```

O token deve ser um JWT válido do Supabase e o usuário deve ter a role `dono_barbearia`.

## 📋 Endpoints

### 1. GET /status/:barbershopId

Retorna o status atual da conexão WhatsApp de uma barbearia.

**Parâmetros:**
- `barbershopId` (path): UUID da barbearia

**Resposta 200:**
```json
{
  "status": "connected",
  "phoneNumber": "5511987654321"
}
```

ou

```json
{
  "status": "qr_code_pending",
  "qrCodeUrl": "data:image/png;base64,..."
}
```

**Status possíveis:**
- `connected`: WhatsApp conectado
- `disconnected`: WhatsApp desconectado
- `qr_code_pending`: Aguardando leitura do QR Code
- `loading`: Processando conexão

**Exemplo de requisição:**
```bash
curl -X GET \
  https://your-node-scheduler-api.com/api/whatsapp/status/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 2. POST /connect/:barbershopId

Inicia o processo de conexão do WhatsApp, gerando um QR Code.

**Parâmetros:**
- `barbershopId` (path): UUID da barbearia

**Resposta 200:**
```json
{
  "qrCodeUrl": "data:image/png;base64,..."
}
```

**Exemplo de requisição:**
```bash
curl -X POST \
  https://your-node-scheduler-api.com/api/whatsapp/connect/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Notas:**
- A instância será criada na Evolution API com o nome `barbershop_{barbershopId}`
- O status será atualizado para `qr_code_pending`
- Use o `qrCodeUrl` retornado para exibir o QR Code no frontend

---

### 3. GET /settings/:barbershopId

Retorna as configurações de lembrete de uma barbearia.

**Parâmetros:**
- `barbershopId` (path): UUID da barbearia

**Resposta 200:**
```json
{
  "messageTemplate": "Olá {{nome}} 👋\nSeu horário está marcado para {{data}} às {{hora}} na {{barbearia}}.\nQualquer imprevisto é só avisar 😉",
  "reminders": [
    {
      "value": 24,
      "unit": "hours"
    }
  ]
}
```

**Variáveis disponíveis no template:**
- `{{nome}}`: Nome do cliente
- `{{data}}`: Data do agendamento (YYYY-MM-DD)
- `{{hora}}`: Hora do agendamento (HH:MM)
- `{{barbearia}}`: Nome da barbearia
- `{{servico}}`: Nome do serviço
- `{{barbeiro}}`: Nome do barbeiro

**Unidades de tempo para reminders:**
- `minutes`: Minutos antes do agendamento
- `hours`: Horas antes do agendamento
- `days`: Dias antes do agendamento

**Exemplo de requisição:**
```bash
curl -X GET \
  https://your-node-scheduler-api.com/api/whatsapp/settings/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 4. POST /settings/:barbershopId

Atualiza as configurações de lembrete de uma barbearia.

**Parâmetros:**
- `barbershopId` (path): UUID da barbearia

**Corpo da requisição:**
```json
{
  "messageTemplate": "Olá {{nome}} 👋\nSeu horário está marcado para {{data}} às {{hora}} na {{barbearia}}.\nQualquer imprevisto é só avisar 😉",
  "reminders": [
    {
      "value": 24,
      "unit": "hours"
    },
    {
      "value": 2,
      "unit": "hours"
    }
  ]
}
```

**Resposta 200:**
```json
{
  "messageTemplate": "Olá {{nome}} 👋\nSeu horário está marcado para {{data}} às {{hora}} na {{barbearia}}.\nQualquer imprevisto é só avisar 😉",
  "reminders": [
    {
      "value": 24,
      "unit": "hours"
    },
    {
      "value": 2,
      "unit": "hours"
    }
  ]
}
```

**Exemplo de requisição:**
```bash
curl -X POST \
  https://your-node-scheduler-api.com/api/whatsapp/settings/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageTemplate": "Olá {{nome}} 👋\nSeu horário está marcado para {{data}} às {{hora}} na {{barbearia}}.\nQualquer imprevisto é só avisar 😉",
    "reminders": [
      {
        "value": 24,
        "unit": "hours"
      },
      {
        "value": 2,
        "unit": "hours"
      }
    ]
  }'
```

---

## ⚠️ Códigos de Erro

### 401 Unauthorized
- Token não fornecido ou inválido
- Token expirado

### 403 Forbidden
- Usuário não é `dono_barbearia`
- Usuário não tem permissão para acessar a barbearia especificada

### 400 Bad Request
- Dados inválidos no corpo da requisição
- Barbearia não associada ao usuário

### 500 Internal Server Error
- Erro interno do servidor
- Erro na comunicação com Evolution API ou Supabase

---

## 🔄 Fluxo de Conexão WhatsApp

1. **POST /connect/:barbershopId**
   - Cria instância na Evolution API
   - Retorna QR Code

2. **GET /status/:barbershopId** (polling)
   - Verifica status da conexão
   - Quando `status === 'connected'`, conexão estabelecida

3. **Configurar lembretes**
   - **GET /settings/:barbershopId**: Ver configurações atuais
   - **POST /settings/:barbershopId**: Atualizar configurações

4. **Scheduler automático**
   - Executa a cada 5 minutos
   - Envia lembretes baseado nas configurações de cada barbearia

---

## 📝 Exemplos de Uso

### Exemplo 1: Conectar WhatsApp

```javascript
// 1. Iniciar conexão
const response = await fetch('/api/whatsapp/connect/123e4567-e89b-12d3-a456-426614174000', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { qrCodeUrl } = await response.json();

// 2. Exibir QR Code
document.getElementById('qr-code').src = qrCodeUrl;

// 3. Verificar status periodicamente
setInterval(async () => {
  const statusResponse = await fetch('/api/whatsapp/status/123e4567-e89b-12d3-a456-426614174000', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const status = await statusResponse.json();
  
  if (status.status === 'connected') {
    console.log('WhatsApp conectado!', status.phoneNumber);
    // Parar polling
  }
}, 3000); // Verificar a cada 3 segundos
```

### Exemplo 2: Configurar Lembretes

```javascript
// Atualizar configurações
const settings = {
  messageTemplate: 'Olá {{nome}}! Seu agendamento é em {{data}} às {{hora}}.',
  reminders: [
    { value: 24, unit: 'hours' },
    { value: 2, unit: 'hours' }
  ]
};

await fetch('/api/whatsapp/settings/123e4567-e89b-12d3-a456-426614174000', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(settings)
});
```

---

## 🗄️ Persistência

Os dados são armazenados em `data/barbershops.json` (MVP). Para produção, considere usar:
- Redis/Upstash
- PostgreSQL (via Supabase)
- MongoDB

---

## 🔒 Segurança

- Todas as rotas requerem autenticação JWT
- Validação de propriedade da barbearia
- Service Role Key do Supabase apenas no backend
- Nunca exponha credenciais no frontend

