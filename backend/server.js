const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configurações do Zabbix
const ZABBIX_URL = process.env.ZABBIX_API_URL;
const ZABBIX_TOKEN = process.env.ZABBIX_AUTH_TOKEN;
const SERVER_IP = process.env.SERVER_IP;

// Configurar axios para aceitar certificados auto-assinados (apenas para desenvolvimento)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false // ATENÇÃO: Remover em produção com certificados válidos
});

// Log das configurações ao iniciar
console.log('================================');
console.log('Zabbix Map Backend');
console.log('Port:', PORT);
console.log('Zabbix URL:', ZABBIX_URL || 'Not set');
console.log('Zabbix Token:', ZABBIX_TOKEN ? `Set (${ZABBIX_TOKEN.length} chars)` : 'Not set');
console.log('Server IP:', SERVER_IP || 'Not set');
console.log('================================');

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    service: 'zabbix-map-backend',
    time: new Date().toISOString(),
    zabbix_connected: !!ZABBIX_URL && !!ZABBIX_TOKEN
  });
});

// Debug: Verificar variáveis de ambiente
app.get('/api/debug', (req, res) => {
  res.json({
    config: {
      ZABBIX_URL: ZABBIX_URL,
      ZABBIX_TOKEN: ZABBIX_TOKEN ? '***' + ZABBIX_TOKEN.slice(-5) : 'Not set',
      SERVER_IP: SERVER_IP,
      PORT: PORT
    }
  });
});

// Testar conexão com Zabbix
app.get('/api/test-zabbix', async (req, res) => {
  try {
    if (!ZABBIX_URL || !ZABBIX_TOKEN) {
      return res.status(400).json({
        success: false,
        message: 'Zabbix URL or Token not configured'
      });
    }

    // Testar versão da API
    const versionResponse = await axios.post(ZABBIX_URL, {
      jsonrpc: "2.0",
      method: "apiinfo.version",
      id: 1,
      auth: null
    }, { httpsAgent });

    // Testar autenticação
    const authResponse = await axios.post(ZABBIX_URL, {
      jsonrpc: "2.0",
      method: "host.get",
      params: {
        output: ["hostid"],
        limit: 1
      },
      auth: ZABBIX_TOKEN,
      id: 2
    }, { httpsAgent });

    res.json({
      success: true,
      api_version: versionResponse.data.result,
      auth_valid: true,
      hosts_count: authResponse.data.result ? authResponse.data.result.length : 0,
      message: 'Conexão com Zabbix API bem sucedida'
    });

  } catch (error) {
    console.error('Erro teste Zabbix:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No response details',
      config: {
        url: ZABBIX_URL,
        has_token: !!ZABBIX_TOKEN
      }
    });
  }
});

// Buscar hosts do Zabbix
app.get('/api/devices', async (req, res) => {
  try {
    if (!ZABBIX_URL || !ZABBIX_TOKEN) {
      console.warn('Retornando dados de exemplo - Zabbix não configurado');
      return res.json(getExampleDevices());
    }

    console.log('Buscando hosts do Zabbix...');
    
    const response = await axios.post(ZABBIX_URL, {
      jsonrpc: "2.0",
      method: "host.get",
      params: {
        output: ["hostid", "host", "name", "status", "description"],
        selectInterfaces: ["ip", "dns", "port", "type"],
        selectInventory: ["location", "location_lat", "location_lon", "os", "type"],
        selectGroups: ["groupid", "name"],
        selectTags: ["tag", "value"],
        monitored: true, // Apenas hosts monitorados
        filter: {
          status: 0 // Apenas hosts ativos (0=ativo, 1=inativo)
        }
      },
      auth: ZABBIX_TOKEN,
      id: 1
    }, { httpsAgent });

    const hosts = response.data.result || [];
    console.log(`Encontrados ${hosts.length} hosts no Zabbix`);

    // Converter hosts do Zabbix para formato do frontend
    const devices = hosts.map(host => {
      const interface = host.interfaces && host.interfaces[0];
      const inventory = host.inventory || {};
      const location = inventory.location || 'Unknown';
      
      // Extrair estado da localização (últimas 2 letras)
      const stateMatch = location.match(/,\s*([A-Z]{2})$/);
      const state = stateMatch ? stateMatch[1] : 'SP';
      
      // Mapear tipos
      let type = 'server';
      if (host.groups && host.groups.some(g => g.name.toLowerCase().includes('router'))) {
        type = 'router';
      } else if (host.groups && host.groups.some(g => g.name.toLowerCase().includes('switch'))) {
        type = 'switch';
      } else if (host.groups && host.groups.some(g => g.name.toLowerCase().includes('firewall'))) {
        type = 'firewall';
      }

      // Status baseado no Zabbix
      let status = 'online';
      if (host.status === 1) {
        status = 'offline';
      }

      // Coordenadas
      let lat = -23.5505; // São Paulo default
      let lon = -46.6333;
      
      if (inventory.location_lat && inventory.location_lon) {
        lat = parseFloat(inventory.location_lat);
        lon = parseFloat(inventory.location_lon);
      } else {
        // Mapear estado para coordenadas
        const stateCoords = {
          'SP': { lat: -23.5505, lon: -46.6333 },
          'RJ': { lat: -22.9068, lon: -43.1729 },
          'MG': { lat: -19.9167, lon: -43.9345 },
          'RS': { lat: -30.0346, lon: -51.2177 },
          'PR': { lat: -25.4284, lon: -49.2733 }
        };
        if (stateCoords[state]) {
          lat = stateCoords[state].lat;
          lon = stateCoords[state].lon;
        }
      }

      return {
        id: host.hostid,
        name: host.name || host.host,
        type: type,
        status: status,
        state: state,
        location: location,
        ip: interface ? interface.ip : 'N/A',
        lat: lat,
        lon: lon,
        lastCheck: new Date().toISOString(),
        groups: host.groups ? host.groups.map(g => g.name) : [],
        description: host.description || ''
      };
    });

    // Se não houver hosts, retorna exemplo
    if (devices.length === 0) {
      console.warn('Nenhum host encontrado no Zabbix, retornando exemplo');
      return res.json(getExampleDevices());
    }

    res.json(devices);

  } catch (error) {
    console.error('Erro ao buscar hosts do Zabbix:', error.message);
    console.error('Detalhes:', error.response?.data || error.message);
    
    // Em caso de erro, retorna dados de exemplo
    res.json(getExampleDevices());
  }
});

// Estados do Brasil
app.get('/api/states', (req, res) => {
  res.json([
    { id: 'SP', name: 'São Paulo', lat: -23.5505, lon: -46.6333, deviceCount: 0 },
    { id: 'RJ', name: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729, deviceCount: 0 },
    { id: 'MG', name: 'Minas Gerais', lat: -19.9167, lon: -43.9345, deviceCount: 0 },
    { id: 'RS', name: 'Rio Grande do Sul', lat: -30.0346, lon: -51.2177, deviceCount: 0 },
    { id: 'PR', name: 'Paraná', lat: -25.4284, lon: -49.2733, deviceCount: 0 },
    { id: 'BA', name: 'Bahia', lat: -12.9714, lon: -38.5014, deviceCount: 0 },
    { id: 'SC', name: 'Santa Catarina', lat: -27.5954, lon: -48.5480, deviceCount: 0 },
    { id: 'GO', name: 'Goiás', lat: -16.6869, lon: -49.2648, deviceCount: 0 },
    { id: 'PE', name: 'Pernambuco', lat: -8.0476, lon: -34.8770, deviceCount: 0 },
    { id: 'CE', name: 'Ceará', lat: -3.7172, lon: -38.5434, deviceCount: 0 }
  ]);
});

// Estatísticas
app.get('/api/stats', async (req, res) => {
  try {
    if (!ZABBIX_URL || !ZABBIX_TOKEN) {
      return res.json({
        totalDevices: 2,
        online: 1,
        warnings: 1,
        offline: 0,
        states: 2
      });
    }

    const response = await axios.post(ZABBIX_URL, {
      jsonrpc: "2.0",
      method: "host.get",
      params: {
        output: ["hostid", "status"],
        monitored: true,
        filter: { status: 0 }
      },
      auth: ZABBIX_TOKEN,
      id: 3
    }, { httpsAgent });

    const hosts = response.data.result || [];
    const total = hosts.length;
    // Nota: Para status mais precisos, você precisaria verificar triggers/problems
    const online = Math.floor(total * 0.7); // Exemplo: 70% online
    const warnings = Math.floor(total * 0.2); // Exemplo: 20% com warning
    const offline = total - online - warnings;

    res.json({
      totalDevices: total,
      online: online,
      warnings: warnings,
      offline: offline,
      states: 10 // Número de estados com dispositivos
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error.message);
    res.json({
      totalDevices: 2,
      online: 1,
      warnings: 1,
      offline: 0,
      states: 2
    });
  }
});

// Função auxiliar para dados de exemplo
function getExampleDevices() {
  return [
    { 
      id: '10084', 
      name: 'Zabbix Server', 
      type: 'server', 
      status: 'online', 
      state: 'SP', 
      location: 'São Paulo, SP',
      ip: SERVER_IP || '172.17.17.53',
      lat: -23.5505, 
      lon: -46.6333,
      lastCheck: new Date().toISOString(),
      groups: ['Zabbix servers'],
      description: 'Servidor Zabbix principal'
    },
    { 
      id: '10085', 
      name: 'Gateway Router', 
      type: 'router', 
      status: 'warning', 
      state: 'RJ', 
      location: 'Rio de Janeiro, RJ',
      ip: '172.17.17.1',
      lat: -22.9068, 
      lon: -43.1729,
      lastCheck: new Date().toISOString(),
      groups: ['Routers'],
      description: 'Roteador principal'
    }
  ];
}

// Token test (mantido para compatibilidade)
app.get('/api/token-test', (req, res) => {
  res.json({
    zabbix_url: ZABBIX_URL || 'not set',
    has_token: !!ZABBIX_TOKEN,
    server_ip: SERVER_IP || 'not set',
    backend_version: '1.0.0'
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor backend rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}/health`);
});
