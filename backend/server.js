const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(express.json());

// Endpoint de saúde PARA O HEALTHCHECK
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'zabbix-map-backend'
  });
});

// Rota principal (exemplo)
app.get('/', (req, res) => {
  res.json({ 
    message: 'Zabbix Map Backend API',
    version: '1.0.0',
    endpoints: ['/health', '/api/zabbix']
  });
});

// Rota para Zabbix (exemplo - implemente depois)
app.get('/api/zabbix', (req, res) => {
  res.json({ 
    message: 'Zabbix API endpoint',
    devices: [] // Aqui virão os dados do Zabbix
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
