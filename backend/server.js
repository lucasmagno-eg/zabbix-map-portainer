const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');
const app = express();
const PORT = 3000;

const ZABBIX_API_URL = process.env.ZABBIX_API_URL;
const ZABBIX_AUTH_TOKEN = process.env.ZABBIX_AUTH_TOKEN;

console.log('=== ZABBIX MAP BACKEND ===');
console.log('API URL:', ZABBIX_API_URL);
console.log('Token:', ZABBIX_AUTH_TOKEN ? 'CONFIGURED' : 'NOT CONFIGURED');

// Agent para ignorar certificado SSL
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

app.use(cors());
app.use(express.json());

// 1. Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'zabbix-map-backend',
    zabbix_configured: !!(ZABBIX_API_URL && ZABBIX_AUTH_TOKEN),
    timestamp: new Date().toISOString()
  });
});

// 2. Token Test
app.get('/api/token-test', async (req, res) => {
  if (!ZABBIX_API_URL || !ZABBIX_AUTH_TOKEN) {
    return res.json({
      configured: false,
      message: 'Missing ZABBIX_API_URL or ZABBIX_AUTH_TOKEN',
      ZABBIX_API_URL: ZABBIX_API_URL || 'NOT SET',
      ZABBIX_AUTH_TOKEN: ZABBIX_AUTH_TOKEN ? 'SET' : 'NOT SET'
    });
  }
  
  try {
    const response = await axios.post(ZABBIX_API_URL, {
      jsonrpc: '2.0',
      method: 'user.checkAuthentication',
      params: { token: ZABBIX_AUTH_TOKEN },
      id: 1
    }, { httpsAgent, timeout: 10000 });
    
    res.json({
      configured: true,
      token_valid: response.data.result,
      user: response.data.result ? response.data.result.username : null,
      message: response.data.result ? '✅ TOKEN VÁLIDO' : '❌ TOKEN INVÁLIDO'
    });
    
  } catch (error) {
    res.json({
      configured: true,
      token_valid: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

// 3. Estados BR
app.get('/api/states', (req, res) => {
  res.json([
    { id: 'SP', name: 'São Paulo', capital: 'São Paulo', lat: -23.5505, lon: -46.6333 },
    { id: 'RJ', name: 'Rio de Janeiro', capital: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729 },
    { id: 'MG', name: 'Minas Gerais', capital: 'Belo Horizonte', lat: -19.9167, lon: -43.9345 },
    { id: 'RS', name: 'Rio Grande do Sul', capital: 'Porto Alegre', lat: -30.0346, lon: -51.2177 },
    { id: 'PR', name: 'Paraná', capital: 'Curitiba', lat: -25.4284, lon: -49.2733 }
  ]);
});

// 4. Dispositivos do Zabbix
app.get('/api/devices', async (req, res) => {
  // Fallback para mock se não tiver token
  if (!ZABBIX_API_URL || !ZABBIX_AUTH_TOKEN) {
    return res.json([
      { id: 'mock-1', name: 'Mock Router SP', type: 'router', status: 'online', state: 'SP', lat: -23.5505, lon: -46.6333 },
      { id: 'mock-2', name: 'Mock Server RJ', type: 'server', status: 'warning', state: 'RJ', lat: -22.9068, lon: -43.1729 }
    ]);
  }
  
  try {
    // Busca hosts do Zabbix
    const response = await axios.post(ZABBIX_API_URL, {
      jsonrpc: '2.0',
      method: 'host.get',
      params: {
        output: ['hostid', 'host', 'name', 'status', 'description'],
        selectInterfaces: ['ip', 'dns'],
        selectInventory: ['location_lat', 'location_lon', 'location_city'],
        filter: { status: '0' }, // Apenas ativos
        limit: 50
      },
      auth: ZABBIX_AUTH_TOKEN,
      id: 2
    }, { httpsAgent, timeout: 15000 });
    
    const hosts = response.data.result || [];
    console.log('Found', hosts.length, 'hosts in Zabbix');
    
    // Converte para nosso formato
    const devices = hosts.map((host, index) => {
      const inventory = host.inventory || {};
      
      // Coordenadas
      let lat = parseFloat(inventory.location_lat);
      let lon = parseFloat(inventory.location_lon);
      
      // Fallback para coordenadas de SP se não tiver
      if (isNaN(lat) || isNaN(lon)) {
        lat = -23.5505 + (Math.random() * 0.3);
        lon = -46.6333 + (Math.random() * 0.3);
      }
      
      // Tipo
      let type = 'server';
      const name = (host.name || host.host || '').toLowerCase();
      if (name.includes('router') || name.includes('roteador')) type = 'router';
      else if (name.includes('switch')) type = 'switch';
      else if (name.includes('firewall')) type = 'firewall';
      
      return {
        id: host.hostid,
        name: host.name || host.host,
        type: type,
        status: host.status === '0' ? 'online' : 'offline',
        state: 'SP',
        city: inventory.location_city || 'São Paulo',
        lat: lat,
        lon: lon,
        ip: host.interfaces?.[0]?.ip || host.interfaces?.[0]?.dns || 'N/A',
        lastCheck: new Date().toISOString(),
        from_zabbix: true
      };
    });
    
    res.json(devices);
    
  } catch (error) {
    console.error('Error fetching from Zabbix:', error.message);
    res.json([
      { id: 'error', name: 'Zabbix Error: ' + error.message, type: 'server', status: 'offline', state: 'BR' }
    ]);
  }
});

// 5. Zabbix Test completo
app.get('/api/zabbix-test', async (req, res) => {
  const result = {
    configured: !!(ZABBIX_API_URL && ZABBIX_AUTH_TOKEN),
    ZABBIX_API_URL: ZABBIX_API_URL || 'NOT SET',
    ZABBIX_AUTH_TOKEN: ZABBIX_AUTH_TOKEN ? 'SET' : 'NOT SET',
    tested_at: new Date().toISOString()
  };
  
  if (!ZABBIX_API_URL || !ZABBIX_AUTH_TOKEN) {
    result.message = 'Configure ZABBIX_API_URL and ZABBIX_AUTH_TOKEN';
    return res.json(result);
  }
  
  try {
    // Testa API
    const apiTest = await axios.post(ZABBIX_API_URL, {
      jsonrpc: '2.0',
      method: 'apiinfo.version',
      id: 1
    }, { httpsAgent, timeout: 5000 });
    result.api_version = apiTest.data.result;
    
    // Testa token
    const tokenTest = await axios.post(ZABBIX_API_URL, {
      jsonrpc: '2.0',
      method: 'user.checkAuthentication',
      params: { token: ZABBIX_AUTH_TOKEN },
      id: 2
    }, { httpsAgent, timeout: 5000 });
    result.token_valid = tokenTest.data.result;
    
    // Conta hosts
    const hostsTest = await axios.post(ZABBIX_API_URL, {
      jsonrpc: '2.0',
      method: 'host.get',
      params: { output: ['hostid'], countOutput: true },
      auth: ZABBIX_AUTH_TOKEN,
      id: 3
    }, { httpsAgent, timeout: 5000 });
    result.host_count = hostsTest.data.result;
    
    result.success = true;
    result.message = '✅ Zabbix connection successful';
    
  } catch (error) {
    result.success = false;
    result.error = error.message;
    result.message = '❌ Zabbix connection failed';
  }
  
  res.json(result);
});

// Inicia servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server running on port', PORT);
  console.log('📡 Health: http://localhost:' + PORT + '/health');
  console.log('🔗 Zabbix: ' + (ZABBIX_API_URL || 'Not configured'));
});
EOF

# 3. Inicia o servidor (AGORA FORA do arquivo JS!)
echo 'Starting server...'
node server.js &
sleep 2
echo 'Server started successfully'
"
