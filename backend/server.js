const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// MIDDLEWARE (DEVE VIR ANTES DAS ROTAS)
app.use(cors());
app.use(express.json());

// ✅ ENDPOINT DE HEALTHCHECK SIMPLIFICADO
app.get('/health', (req, res) => {
  console.log('Health check called');
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ✅ ENDPOINT RAIZ TAMBÉM
app.get('/', (req, res) => {
  res.json({ 
    message: 'Zabbix Map API', 
    version: '1.0.0',
    endpoints: ['/health', '/api/devices', '/api/states'] 
  });
});

// ... resto do código (rotas /api/devices, /api/states)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend iniciado na porta ${PORT}`);
});
