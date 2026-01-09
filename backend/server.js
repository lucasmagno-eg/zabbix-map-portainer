const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = 3000;

const ZABBIX_API_URL = process.env.ZABBIX_API_URL;
const ZABBIX_AUTH_TOKEN = process.env.ZABBIX_AUTH_TOKEN;
const SERVER_IP = process.env.SERVER_IP || 'localhost';

console.log('=== CONFIG ===');
console.log('SERVER_IP:', SERVER_IP);
console.log('ZABBIX_API_URL:', ZABBIX_API_URL || 'NOT SET');
console.log('ZABBIX_AUTH_TOKEN:', ZABBIX_AUTH_TOKEN ? 'SET' : 'NOT SET');

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    zabbix_configured: !!(ZABBIX_API_URL && ZABBIX_AUTH_TOKEN),
    time: new Date().toISOString()
  });
});

app.get('/api/token-test', async (req, res) => {
  const result = {
    configured: !!(ZABBIX_API_URL && ZABBIX_AUTH_TOKEN),
    ZABBIX_API_URL: ZABBIX_API_URL || 'NOT SET',
    ZABBIX_AUTH_TOKEN: ZABBIX_AUTH_TOKEN ? 'SET' : 'NOT SET',
    tested_at: new Date().toISOString()
  };
  
  if (!ZABBIX_API_URL || !ZABBIX_AUTH_TOKEN) {
    result.message = 'Set ZABBIX_API_URL and ZABBIX_AUTH_TOKEN in docker-compose.yml';
    return res.json(result);
  }
  
  try {
    const response = await axios.post(ZABBIX_API_URL, {
      jsonrpc: '2.0',
      method: 'user.checkAuthentication',
      params: { token: ZABBIX_AUTH_TOKEN },
      id: 1
    }, { timeout: 10000 });
    
    result.token_valid = response.data.result;
    result.message = response.data.result ? 'TOKEN VALID' : 'TOKEN INVALID';
    result.success = true;
    
  } catch (error) {
    result.success = false;
    result.error = error.message;
    result.details = error.response?.data?.error || 'No details';
  }
  
  res.json(result);
});

app.get('/api/states', (req, res) => {
  res.json([
    { id: 'SP', name: 'São Paulo', lat: -23.5505, lon: -46.6333 },
    { id: 'RJ', name: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729 },
    { id: 'MG', name: 'Minas Gerais', lat: -19.9167, lon: -43.9345 }
  ]);
});

app.get('/api/devices', async (req, res) => {
  if (!ZABBIX_API_URL || !ZABBIX_AUTH_TOKEN) {
    return res.json([
      { id: '1', name: 'Mock Router SP', type: 'router', status: 'online', state: 'SP', lat: -23.5505, lon: -46.6333 },
      { id: '2', name: 'Mock Server RJ', type: 'server', status: 'warning', state: 'RJ', lat: -22.9068, lon: -43.1729 }
    ]);
  }
  
  try {
    const response = await axios.post(ZABBIX_API_URL, {
      jsonrpc: '2.0',
      method: 'host.get',
      params: { output: ['hostid', 'host'], filter: { status: '0' }, limit: 5 },
      auth: ZABBIX_AUTH_TOKEN,
      id: 2
    });
    
    const hosts = response.data.result || [];
    const devices = hosts.map((host, i) => ({
      id: host.hostid,
      name: host.host,
      type: 'server',
      status: 'online',
      state: i % 2 === 0 ? 'SP' : 'RJ',
      lat: i % 2 === 0 ? -23.5505 : -22.9068,
      lon: i % 2 === 0 ? -46.6333 : -43.1729
    }));
    
    res.json(devices);
    
  } catch (error) {
    res.json([
      { id: 'error', name: 'Error: ' + error.message, type: 'server', status: 'offline', state: 'BR', lat: -15.7801, lon: -47.9292 }
    ]);
  }
});

app.get('/api/zabbix-test', (req, res) => {
  res.json({
    config: {
      ZABBIX_API_URL: ZABBIX_API_URL || 'NOT SET',
      ZABBIX_AUTH_TOKEN: ZABBIX_AUTH_TOKEN ? 'SET' : 'NOT SET'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server started on port', PORT);
});
EOF

node server.js &
sleep 2
echo 'Server started'
"
