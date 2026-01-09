const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = 3000;

// Configurações DO CONTAINER
const ZABBIX_API_URL = process.env.ZABBIX_API_URL;
const ZABBIX_AUTH_TOKEN = process.env.ZABBIX_AUTH_TOKEN;
const SERVER_IP = process.env.SERVER_IP || 'localhost';

console.log('========================================');
console.log('🔧 CONFIGURAÇÕES CARREGADAS:');
console.log('📍 SERVER_IP:', SERVER_IP);
console.log('🔗 ZABBIX_API_URL:', ZABBIX_API_URL || 'NÃO CONFIGURADO');
console.log('🔑 ZABBIX_AUTH_TOKEN:', ZABBIX_AUTH_TOKEN ? 'CONFIGURADO (' + ZABBIX_AUTH_TOKEN.substring(0, 10) + '...)' : 'NÃO CONFIGURADO');
console.log('========================================');

// Middleware
app.use(cors());
app.use(express.json());

// 1. HEALTH CHECK
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'zabbix-map-backend',
    zabbix_configured: !!(ZABBIX_API_URL && ZABBIX_AUTH_TOKEN),
    container_ip: SERVER_IP,
    timestamp: new Date().toISOString(),
    endpoints: ['/health', '/api/token-test', '/api/states', '/api/devices', '/api/zabbix-test']
  });
});

// 2. TOKEN TEST
app.get('/api/token-test', async (req, res) => {
  const result = {
    configured: !!(ZABBIX_API_URL && ZABBIX_AUTH_TOKEN),
    ZABBIX_API_URL: ZABBIX_API_URL || 'NÃO CONFIGURADO',
    ZABBIX_AUTH_TOKEN: ZABBIX_AUTH_TOKEN ? 'CONFIGURADO' : 'NÃO CONFIGURADO',
    token_preview: ZABBIX_AUTH_TOKEN ? ZABBIX_AUTH_TOKEN.substring(0, 15) + '...' : 'N/A',
    tested_at: new Date().toISOString()
  };
  
  if (!ZABBIX_API_URL || !ZABBIX_AUTH_TOKEN) {
    return res.json({...result, message: 'Configure ZABBIX_API_URL e ZABBIX_AUTH_TOKEN no docker-compose.yml'});
  }
  
  try {
    const response = await axios.post(ZABBIX_API_URL, {
      jsonrpc: '2.0',
      method: 'user.checkAuthentication',
      params: { token: ZABBIX_AUTH_TOKEN },
      id: 1
    }, { timeout: 10000 });
    
    result.token_valid = response.data.result;
    result.message = response.data.result ? '✅ TOKEN VÁLIDO!' : '❌ TOKEN INVÁLIDO';
    result.success = true;
    
  } catch (error) {
    result.success = false;
    result.error = error.message;
    result.details = error.response?.data?.error || 'Sem detalhes';
    result.message = '❌ ERRO AO TESTAR TOKEN';
  }
  
  res.json(result);
});

// 3. ESTADOS BR
app.get('/api/states', (req, res) => {
  res.json([
    { id: 'SP', name: 'São Paulo', capital: 'São Paulo', lat: -23.5505, lon: -46.6333, deviceCount: 0 },
    { id: 'RJ', name: 'Rio de Janeiro', capital: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729, deviceCount: 0 },
    { id: 'MG', name: 'Minas Gerais', capital: 'Belo Horizonte', lat: -19.9167, lon: -43.9345, deviceCount: 0 },
    { id: 'RS', name: 'Rio Grande do Sul', capital: 'Porto Alegre', lat: -30.0346, lon: -51.2177, deviceCount: 0 },
    { id: 'PR', name: 'Paraná', capital: 'Curitiba', lat: -25.4284, lon: -49.2733, deviceCount: 0 }
  ]);
});

// 4. DISPOSITIVOS
app.get('/api/devices', async (req, res) => {
  // Se não tiver token, retorna mock
  if (!ZABBIX_API_URL || !ZABBIX_AUTH_TOKEN) {
    return res.json([
      { id: 'mock-1', name: 'Mock Router SP', type: 'router', status: 'online', state: 'SP', lat: -23.5505, lon: -46.6333, lastCheck: new Date().toISOString() },
      { id: 'mock-2', name: 'Mock Server RJ', type: 'server', status: 'warning', state: 'RJ', lat: -22.9068, lon: -43.1729, lastCheck: new Date().toISOString() }
    ]);
  }
  
  try {
    // Tenta buscar do Zabbix
    const response = await axios.post(ZABBIX_API_URL, {
      jsonrpc: '2.0',
      method: 'host.get',
      params: {
        output: ['hostid', 'host', 'name'],
        filter: { status: '0' },
        limit: 10
      },
      auth: ZABBIX_AUTH_TOKEN,
      id: 2
    });
    
    const hosts = response.data.result || [];
    const devices = hosts.map((host, i) => ({
      id: host.hostid,
      name: host.name || host.host,
      type: 'server',
      status: 'online',
      state: i % 2 === 0 ? 'SP' : 'RJ',
      lat: i % 2 === 0 ? -23.5505 : -22.9068,
      lon: i % 2 === 0 ? -46.6333 : -43.1729,
      lastCheck: new Date().toISOString(),
      from_zabbix: true
    }));
    
    res.json(devices);
    
  } catch (error) {
    // Fallback para mock em caso de erro
    res.json([
      { id: 'error-1', name: 'Erro Zabbix: ' + error.message, type: 'server', status: 'offline', state: 'BR', lat: -15.7801, lon: -47.9292, lastCheck: new Date().toISOString() }
    ]);
  }
});

// 5. ZABBIX TEST COMPLETO
app.get('/api/zabbix-test', (req, res) => {
  res.json({
    test: 'zabbix-connection',
    configuration: {
      ZABBIX_API_URL: ZABBIX_API_URL || 'NÃO CONFIGURADO',
      ZABBIX_AUTH_TOKEN: ZABBIX_AUTH_TOKEN ? 'CONFIGURADO' : 'NÃO CONFIGURADO',
      token_preview: ZABBIX_AUTH_TOKEN ? ZABBIX_AUTH_TOKEN.substring(0, 10) + '...' : 'N/A'
    },
    message: 'Use /api/token-test para testar a conexão',
    endpoints_available: ['/health', '/api/token-test', '/api/states', '/api/devices', '/api/zabbix-test']
  });
});

// Inicia servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 BACKEND INICIADO NA PORTA ' + PORT);
  console.log('📡 Health: http://localhost:' + PORT + '/health');
  console.log('🔐 Token test: http://localhost:' + PORT + '/api/token-test');
  console.log('🗺️  Mapa: http://' + SERVER_IP + ':23000');
});

// Trata erros
server.on('error', (err) => {
  console.error('❌ ERRO NO SERVIDOR:', err.message);
});
EOF

# 3. Inicia o servidor
echo 'Iniciando servidor Node.js...'
node server.js &

# 4. Aguarda e testa
sleep 3
echo '=== TESTANDO LOCALMENTE DENTRO DO CONTAINER ==='
if command -v curl >/dev/null; then
  curl -s http://localhost:3000/health || echo 'Health check falhou'
else
  # Instala curl se não tiver
  echo 'Instalando curl...'
  apk update && apk add curl
  sleep 2
  curl -s http://localhost:3000/health || echo 'Health check falhou'
fi
"
