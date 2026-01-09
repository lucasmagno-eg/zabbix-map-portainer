const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');
const app = express();
const PORT = 3000;

const ZABBIX_API_URL = process.env.ZABBIX_API_URL;
const ZABBIX_AUTH_TOKEN = process.env.ZABBIX_AUTH_TOKEN;

console.log('ZABBIX CONFIG CHECK:');
console.log('URL:', ZABBIX_API_URL);
console.log('TOKEN:', ZABBIX_AUTH_TOKEN ? 'YES' : 'NO');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    has_zabbix: !!(ZABBIX_API_URL && ZABBIX_AUTH_TOKEN),
    time: new Date().toISOString()
  });
});

app.get('/api/token-test', async (req, res) => {
  if (!ZABBIX_API_URL || !ZABBIX_AUTH_TOKEN) {
    return res.json({
      ok: false,
      error: 'Missing config',
      url: ZABBIX_API_URL || 'no',
      token: ZABBIX_AUTH_TOKEN ? 'yes' : 'no'
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
      ok: true,
      valid: response.data.result,
      user: response.data.result ? response.data.result.username : null,
      message: response.data.result ? 'TOKEN OK' : 'TOKEN BAD'
    });
    
  } catch (error) {
    res.json({
      ok: false,
      error: error.message
    });
  }
});

app.get('/api/states', (req, res) => {
  res.json([
    { id: 'SP', name: 'Sao Paulo', lat: -23.5505, lon: -46.6333 },
    { id: 'RJ', name: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729 },
    { id: 'MG', name: 'Minas Gerais', lat: -19.9167, lon: -43.9345 }
  ]);
});

app.get('/api/devices', async (req, res) => {
  if (!ZABBIX_API_URL || !ZABBIX_AUTH_TOKEN) {
    return res.json([
      { id: '1', name: 'Test SP', type: 'server', status: 'online', state: 'SP', lat: -23.5505, lon: -46.6333 },
      { id: '2', name: 'Test RJ', type: 'router', status: 'warning', state: 'RJ', lat: -22.9068, lon: -43.1729 }
    ]);
  }
  
  try {
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
    }, { httpsAgent, timeout: 10000 });
    
    const hosts = response.data.result || [];
    const devices = hosts.map((host, i) => ({
      id: host.hostid,
      name: host.name || host.host,
      type: 'server',
      status: 'online',
      state: 'SP',
      lat: -23.5505 + (Math.random() * 0.1),
      lon: -46.6333 + (Math.random() * 0.1),
      from_zabbix: true
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
    url: ZABBIX_API_URL || 'not set',
    token: ZABBIX_AUTH_TOKEN ? 'set' : 'not set'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on port', PORT);
});
EOF

echo 'Server.js created successfully'
"
