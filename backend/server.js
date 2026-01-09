const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Configurações
const ZABBIX_API_URL = process.env.ZABBIX_API_URL;
const ZABBIX_AUTH_TOKEN = process.env.ZABBIX_AUTH_TOKEN;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'zabbix-map-api',
    zabbix_configured: !!ZABBIX_API_URL,
    timestamp: new Date().toISOString()
  });
});

// Teste do token
app.get('/api/token-test', async (req, res) => {
  try {
    if (!ZABBIX_AUTH_TOKEN) {
      return res.json({ token_configured: false, message: 'Token não configurado' });
    }
    
    const response = await axios.post(ZABBIX_API_URL, {
      jsonrpc: '2.0',
      method: 'user.checkAuthentication',
      params: { token: ZABBIX_AUTH_TOKEN },
      id: 1
    });
    
    res.json({
      token_configured: true,
      token_valid: response.data.result,
      message: response.data.result ? '✅ Token válido!' : '❌ Token inválido'
    });
    
  } catch (error) {
    res.json({
      token_configured: true,
      token_valid: false,
      error: error.message
    });
  }
});

// Dispositivos mock (temporário)
app.get('/api/devices', (req, res) => {
  const devices = [
    { id: '1', name: 'Router SP-01', type: 'router', status: 'online', state: 'SP', lat: -23.5505, lon: -46.6333 },
    { id: '2', name: 'Server RJ-01', type: 'server', status: 'warning', state: 'RJ', lat: -22.9068, lon: -43.1729 }
  ];
  res.json(devices);
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend rodando na porta ${PORT}`);
  console.log(`Zabbix URL: ${ZABBIX_API_URL || 'Não configurada'}`);
  console.log(`Token: ${ZABBIX_AUTH_TOKEN ? 'Configurado' : 'Não configurado'}`);
});
