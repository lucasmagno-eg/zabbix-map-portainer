const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint de saúde
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'zabbix-map-api' });
});

// Endpoint para listar estados brasileiros
app.get('/api/states', (req, res) => {
  const brazilianStates = [
    { id: 'SP', name: 'São Paulo', capital: 'São Paulo', lat: -23.5505, lon: -46.6333 },
    { id: 'RJ', name: 'Rio de Janeiro', capital: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729 },
    { id: 'MG', name: 'Minas Gerais', capital: 'Belo Horizonte', lat: -19.9167, lon: -43.9345 },
    { id: 'RS', name: 'Rio Grande do Sul', capital: 'Porto Alegre', lat: -30.0346, lon: -51.2177 },
    { id: 'PR', name: 'Paraná', capital: 'Curitiba', lat: -25.4284, lon: -49.2733 },
    { id: 'SC', name: 'Santa Catarina', capital: 'Florianópolis', lat: -27.5954, lon: -48.5480 },
    { id: 'BA', name: 'Bahia', capital: 'Salvador', lat: -12.9714, lon: -38.5014 },
    { id: 'CE', name: 'Ceará', capital: 'Fortaleza', lat: -3.7319, lon: -38.5267 },
    { id: 'PE', name: 'Pernambuco', capital: 'Recife', lat: -8.0476, lon: -34.8770 },
    { id: 'GO', name: 'Goiás', capital: 'Goiânia', lat: -16.6869, lon: -49.2648 }
  ];
  res.json(brazilianStates);
});

// Endpoint MOCK para dispositivos Zabbix (substituir pela API real)
app.get('/api/devices', (req, res) => {
  const mockDevices = [
    { 
      id: 'device-1', 
      name: 'Router SP-01', 
      type: 'router', 
      status: 'online', 
      state: 'SP',
      city: 'São Paulo',
      lat: -23.5505, 
      lon: -46.6333,
      lastCheck: '2024-01-15T10:30:00Z'
    },
    { 
      id: 'device-2', 
      name: 'Switch RJ-01', 
      type: 'switch', 
      status: 'warning', 
      state: 'RJ',
      city: 'Rio de Janeiro',
      lat: -22.9068, 
      lon: -43.1729,
      lastCheck: '2024-01-15T09:15:00Z'
    },
    { 
      id: 'device-3', 
      name: 'Server MG-01', 
      type: 'server', 
      status: 'offline', 
      state: 'MG',
      city: 'Belo Horizonte',
      lat: -19.9167, 
      lon: -43.9345,
      lastCheck: '2024-01-14T22:45:00Z'
    },
    { 
      id: 'device-4', 
      name: 'Firewall PR-01', 
      type: 'firewall', 
      status: 'online', 
      state: 'PR',
      city: 'Curitiba',
      lat: -25.4284, 
      lon: -49.2733,
      lastCheck: '2024-01-15T11:20:00Z'
    },
    { 
      id: 'device-5', 
      name: 'Load Balancer RS-01', 
      type: 'loadbalancer', 
      status: 'online', 
      state: 'RS',
      city: 'Porto Alegre',
      lat: -30.0346, 
      lon: -51.2177,
      lastCheck: '2024-01-15T08:45:00Z'
    }
  ];
  res.json(mockDevices);
});

// Endpoint para integração FUTURA com Zabbix API real
app.get('/api/zabbix/devices', async (req, res) => {
  try {
    // EXEMPLO de como integrar com Zabbix API
    // const zabbixUrl = process.env.ZABBIX_API_URL || 'http://zabbix-server/api_jsonrpc.php';
    // const response = await axios.post(zabbixUrl, {
    //   jsonrpc: '2.0',
    //   method: 'host.get',
    //   params: {
    //     output: ['hostid', 'host', 'name'],
    //     selectInterfaces: ['ip', 'port'],
    //     selectInventory: ['location_lat', 'location_lon', 'location_city']
    //   },
    //   auth: process.env.ZABBIX_TOKEN,
    //   id: 1
    // });
    // res.json(response.data.result);
    
    res.json({ message: 'Endpoint para Zabbix API - Configure as variáveis de ambiente' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao conectar com Zabbix' });
  }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Zabbix Map API rodando em http://0.0.0.0:${PORT}`);
  console.log(`📌 Health check: http://localhost:${PORT}/health`);
  console.log(`📌 Dispositivos: http://localhost:${PORT}/api/devices`);
  console.log(`📌 Estados: http://localhost:${PORT}/api/states`);
});
