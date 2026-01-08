const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// Dados MOCK de dispositivos
const devices = [
  { id: 1, name: "Servidor SP", lat: -23.5505, lng: -46.6333, status: "online", city: "São Paulo" },
  { id: 2, name: "Router RJ", lat: -22.9068, lng: -43.1729, status: "online", city: "Rio de Janeiro" },
  { id: 3, name: "Switch BH", lat: -19.9167, lng: -43.9345, status: "warning", city: "Belo Horizonte" },
  { id: 4, name: "Firewall DF", lat: -15.7801, lng: -47.9292, status: "online", city: "Brasília" },
  { id: 5, name: "Servidor POA", lat: -30.0346, lng: -51.2177, status: "offline", city: "Porto Alegre" },
  { id: 6, name: "AP Manaus", lat: -3.1190, lng: -60.0217, status: "online", city: "Manaus" },
  { id: 7, name: "Storage Fortaleza", lat: -3.7319, lng: -38.5267, status: "online", city: "Fortaleza" },
  { id: 8, name: "Servidor Recife", lat: -8.0476, lng: -34.8770, status: "warning", city: "Recife" },
];

// API simples
app.get('/api/devices', (req, res) => {
  res.json({
    success: true,
    devices: devices,
    total: devices.length,
    ports: {
      frontend: 23000,
      backend: 23001
    },
    message: "✅ Zabbix Map rodando nas portas 23000+!"
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Zabbix Map Backend',
    port: 23001,
    frontend_port: 23000
  });
});

// Rota de exemplo para estatísticas
app.get('/api/stats', (req, res) => {
  const online = devices.filter(d => d.status === 'online').length;
  const warning = devices.filter(d => d.status === 'warning').length;
  const offline = devices.filter(d => d.status === 'offline').length;
  
  res.json({
    total: devices.length,
    online,
    warning,
    offline,
    health_percentage: Math.round((online / devices.length) * 100)
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta interna: ${PORT}`);
  console.log(`🌐 Acessível externamente na porta: 23001`);
  console.log(`📍 API Endpoints:`);
  console.log(`   http://localhost:23001/api/devices`);
  console.log(`   http://localhost:23001/api/health`);
  console.log(`   http://localhost:23001/api/stats`);
});
