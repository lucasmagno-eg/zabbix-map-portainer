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
];

// API simples
app.get('/api/devices', (req, res) => {
  res.json({
    success: true,
    devices: devices,
    total: devices.length,
    message: "✅ Zabbix Map funcionando no Portainer!"
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Zabbix Map Backend'
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando: http://localhost:${PORT}`);
  console.log(`📍 API Devices: http://localhost:${PORT}/api/devices`);
});
