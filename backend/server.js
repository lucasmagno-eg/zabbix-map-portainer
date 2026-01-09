const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');
const app = express();
const PORT = 3000;

const ZABBIX_API_URL = process.env.ZABBIX_API_URL;
const ZABBIX_AUTH_TOKEN = process.env.ZABBIX_AUTH_TOKEN;

console.log('ZABBIX CONFIG:');
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
    { id: 'RJ', name: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729 }
  ]);
});

app.get('/api/devices', async (req, res) => {
  if (!ZABBIX_API_URL || !ZABBIX_AUTH_TOKEN) {
    return res.json([
      { id: '1', name: 'Test Device', type: 'server', status: 'online', state: 'SP', lat: -23.55, lon: -46.63 }
    ]);
  }
  
  try {
    const response = await axios.post(ZABBIX_API_URL, {
      jsonrpc: '2.0',
      method: 'host.get',
      params: {
        output: ['hostid', 'host'],
        filter: { status: '0' },
        limit: 5
      },
      auth: ZABBIX_AUTH_TOKEN,
      id: 2
    }, { httpsAgent, timeout: 10000 });
    
    const hosts = response.data.result || [];
    const devices = hosts.map((host, i) => ({
      id: host.hostid,
      name: host.host,
      type: 'server',
      status: 'online',
      state: 'SP',
      lat: -23.55,
      lon: -46.63
    }));
    
    res.json(devices);
    
  } catch (error) {
    res.json([
      { id: 'error', name: 'Error', type: 'server', status: 'offline' }
    ]);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on port', PORT);
});
EOF
echo 'File created'
"
