const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    service: 'zabbix-map-backend',
    time: new Date().toISOString()
  });
});

// Token test
app.get('/api/token-test', (req, res) => {
  res.json({
    zabbix_url: process.env.ZABBIX_API_URL || 'not set',
    has_token: !!process.env.ZABBIX_AUTH_TOKEN,
    server_ip: process.env.SERVER_IP || 'not set'
  });
});

// States
app.get('/api/states', (req, res) => {
  res.json([
    { id: 'SP', name: 'Sao Paulo', lat: -23.5505, lon: -46.6333 },
    { id: 'RJ', name: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729 }
  ]);
});

// Devices
app.get('/api/devices', (req, res) => {
  res.json([
    { id: '1', name: 'Test Device 1', type: 'server', status: 'online', state: 'SP', lat: -23.5505, lon: -46.6333 },
    { id: '2', name: 'Test Device 2', type: 'router', status: 'warning', state: 'RJ', lat: -22.9068, lon: -43.1729 }
  ]);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('================================');
  console.log('Zabbix Map Backend');
  console.log('Port:', PORT);
  console.log('Zabbix URL:', process.env.ZABBIX_API_URL || 'Not set');
  console.log('Zabbix Token:', process.env.ZABBIX_AUTH_TOKEN ? 'Set' : 'Not set');
  console.log('================================');
});
