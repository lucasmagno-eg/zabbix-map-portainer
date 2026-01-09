const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configurações do Zabbix
const ZABBIX_URL = process.env.ZABBIX_API_URL;
const ZABBIX_TOKEN = process.env.ZABBIX_AUTH_TOKEN;
const SERVER_IP = process.env.SERVER_IP;

// Configurar axios para aceitar certificados auto-assinados
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Log das configurações ao iniciar
console.log('================================');
console.log('Zabbix Map Backend - Roteadores Aruba');
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

    const versionResponse = await axios.post(ZABBIX_URL, {
      jsonrpc: "2.0",
      method: "apiinfo.version",
      id: 1,
      auth: null
    }, { httpsAgent });

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

// Buscar grupo ID dos Roteadores Aruba
async function getArubaGroupId() {
  try {
    const response = await axios.post(ZABBIX_URL, {
      jsonrpc: "2.0",
      method: "hostgroup.get",
      params: {
        output: ["groupid", "name"],
        search: {
          name: "Roteadores Aruba"
        },
        searchWildcardsEnabled: true
      },
      auth: ZABBIX_TOKEN,
      id: 100
    }, { httpsAgent });

    if (response.data.result && response.data.result.length > 0) {
      console.log(`✅ Grupo encontrado: ${response.data.result[0].name} (ID: ${response.data.result[0].groupid})`);
      return response.data.result[0].groupid;
    }

    // Tentar busca mais ampla
    const allGroupsResponse = await axios.post(ZABBIX_URL, {
      jsonrpc: "2.0",
      method: "hostgroup.get",
      params: {
        output: ["groupid", "name"],
        limit: 50
      },
      auth: ZABBIX_TOKEN,
      id: 101
    }, { httpsAgent });

    const arubaGroup = allGroupsResponse.data.result.find(group => 
      group.name.toLowerCase().includes('aruba') || 
      group.name.toLowerCase().includes('roteador')
    );

    if (arubaGroup) {
      console.log(`✅ Grupo similar encontrado: ${arubaGroup.name} (ID: ${arubaGroup.groupid})`);
      return arubaGroup.groupid;
    }

    console.log('⚠️ Grupo "Roteadores Aruba" não encontrado. Listando todos os grupos:');
    allGroupsResponse.data.result.slice(0, 10).forEach(group => {
      console.log(`   - ${group.name} (${group.groupid})`);
    });

    return null;
  } catch (error) {
    console.error('Erro ao buscar grupos:', error.message);
    return null;
  }
}

// Buscar hosts do grupo Roteadores Aruba
app.get('/api/devices', async (req, res) => {
  try {
    if (!ZABBIX_URL || !ZABBIX_TOKEN) {
      console.warn('Retornando dados de exemplo - Zabbix não configurado');
      return res.json(getExampleDevices());
    }

    console.log('🔍 Buscando hosts do grupo "Roteadores Aruba"...');
    
    // 1. Buscar o ID do grupo Aruba
    const arubaGroupId = await getArubaGroupId();
    
    if (!arubaGroupId) {
      console.log('⚠️ Grupo não encontrado, buscando todos os hosts e filtrando...');
      
      // Buscar todos os hosts e filtrar por nome do grupo
      const allHostsResponse = await axios.post(ZABBIX_URL, {
        jsonrpc: "2.0",
        method: "host.get",
        params: {
          output: ["hostid", "host", "name", "status", "description", "available"],
          selectInterfaces: ["ip", "dns", "port", "type", "main"],
          selectInventory: ["location", "location_lat", "location_lon", "os", "type", "site_address_a", "site_address_b", "site_address_c"],
          selectGroups: ["groupid", "name"],
          filter: { status: 0 },
          limit: 200
        },
        auth: ZABBIX_TOKEN,
        id: 1
      }, { httpsAgent });

      const allHosts = allHostsResponse.data.result || [];
      
      // Filtrar hosts que pertencem a grupo com "Aruba" no nome
      const arubaHosts = allHosts.filter(host => 
        host.groups && host.groups.some(group => 
          group.name.toLowerCase().includes('aruba')
        )
      );

      console.log(`📊 Total de hosts: ${allHosts.length}`);
      console.log(`📊 Hosts Aruba (por filtro): ${arubaHosts.length}`);
      
      if (arubaHosts.length === 0) {
        console.log('📋 Grupos disponíveis:');
        const uniqueGroups = [...new Set(allHosts.flatMap(h => h.groups || []).map(g => g.name))];
        uniqueGroups.slice(0, 20).forEach(group => console.log(`   - ${group}`));
      }
      
      const devices = convertHostsToDevices(arubaHosts);
      return res.json(devices);
    }

    // 2. Buscar hosts pelo groupid do grupo Aruba
    const response = await axios.post(ZABBIX_URL, {
      jsonrpc: "2.0",
      method: "host.get",
      params: {
        output: ["hostid", "host", "name", "status", "description", "available"],
        selectInterfaces: ["ip", "dns", "port", "type", "main"],
        selectInventory: ["location", "location_lat", "location_lon", "os", "type", "site_address_a", "site_address_b", "site_address_c", "notes", "poc_1_email"],
        selectGroups: ["groupid", "name"],
        groupids: [arubaGroupId],
        filter: { status: 0 },
        limit: 200
      },
      auth: ZABBIX_TOKEN,
      id: 2
    }, { httpsAgent });

    const hosts = response.data.result || [];
    console.log(`✅ Encontrados ${hosts.length} hosts no grupo "Roteadores Aruba"`);

    const devices = convertHostsToDevices(hosts);
    res.json(devices);

  } catch (error) {
    console.error('Erro ao buscar hosts do Zabbix:', error.message);
    console.error('Detalhes:', error.response?.data || error.message);
    
    res.json(getExampleDevices());
  }
});

// Função para converter hosts do Zabbix para formato do frontend
function convertHostsToDevices(hosts) {
  if (!hosts || hosts.length === 0) {
    console.warn('Nenhum host para converter');
    return getExampleDevices();
  }

  return hosts.map(host => {
    const interface = host.interfaces && host.interfaces.find(i => i.main === '1') || host.interfaces?.[0];
    const inventory = host.inventory || {};
    
    // LOCALIZAÇÃO - Buscar de várias fontes
    let location = inventory.location || 
                  inventory.site_address_a || 
                  inventory.site_address_b || 
                  inventory.site_address_c || 
                  'Localização não definida';
    
    // COORDENADAS - Prioridade: location_lat/location_lon do inventário
    let lat = null;
    let lon = null;
    let hasExactCoords = false;
    
    if (inventory.location_lat && inventory.location_lon) {
      lat = parseFloat(inventory.location_lat);
      lon = parseFloat(inventory.location_lon);
      hasExactCoords = true;
      console.log(`📍 ${host.name}: Coordenadas exatas do inventário: ${lat}, ${lon}`);
    } else {
      console.log(`⚠️ ${host.name}: Sem coordenadas no inventário`);
      
      // Tentar extrair coordenadas de notes ou descrição
      const notes = inventory.notes || host.description || '';
      const coordMatch = notes.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
      if (coordMatch) {
        lat = parseFloat(coordMatch[1]);
        lon = parseFloat(coordMatch[2]);
        console.log(`   → Coordenadas encontradas em notes: ${lat}, ${lon}`);
      }
    }
    
    // Se não tem coordenadas, usar fallback baseado no local
    if (!lat || !lon) {
      // Extrair estado da localização
      const stateMatch = location.match(/,\s*([A-Z]{2})$/);
      const state = stateMatch ? stateMatch[1] : 'SP';
      
      // Mapear estado para coordenadas padrão
      const stateCoords = {
        'SP': { lat: -23.5505, lon: -46.6333 },
        'RJ': { lat: -22.9068, lon: -43.1729 },
        'MG': { lat: -19.9167, lon: -43.9345 },
        'RS': { lat: -30.0346, lon: -51.2177 },
        'PR': { lat: -25.4284, lon: -49.2733 },
        'BA': { lat: -12.9714, lon: -38.5014 },
        'SC': { lat: -27.5954, lon: -48.5480 },
        'GO': { lat: -16.6869, lon: -49.2648 },
        'PE': { lat: -8.0476, lon: -34.8770 },
        'CE': { lat: -3.7172, lon: -38.5434 }
      };
      
      if (stateCoords[state]) {
        lat = stateCoords[state].lat;
        lon = stateCoords[state].lon;
        console.log(`   → Usando coordenadas do estado ${state}: ${lat}, ${lon}`);
      } else {
        lat = -23.5505;
        lon = -46.6333;
      }
    }
    
    // EXTRAIR ESTADO
    const stateMatch = location.match(/,\s*([A-Z]{2})$/);
    const state = stateMatch ? stateMatch[1] : 'SP';
    
    // TIPO - sempre router para Aruba
    const type = 'router';
    
    // STATUS baseado no Zabbix
    let status = 'online';
    if (host.status === 1) {
      status = 'offline';
    } else if (host.available === '0') {
      status = 'warning';
    }
    
    // Limpar nome para exibição
    let displayName = host.name || host.host;
    displayName = displayName.split('.')[0];
    displayName = displayName.replace(/^aruba-|^router-|^rt-|^ap-/i, '');
    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    
    return {
      id: host.hostid,
      name: displayName,
      originalName: host.name || host.host,
      type: type,
      status: status,
      state: state,
      location: location,
      ip: interface ? interface.ip : 'N/A',
      lat: lat,
      lon: lon,
      hasExactCoords: hasExactCoords,
      lastCheck: new Date().toISOString(),
      groups: host.groups ? host.groups.map(g => g.name) : [],
      description: host.description || '',
      inventory: {
        location_lat: inventory.location_lat,
        location_lon: inventory.location_lon,
        os: inventory.os,
        type: inventory.type,
        notes: inventory.notes,
        site_address_a: inventory.site_address_a,
        site_address_b: inventory.site_address_b,
        site_address_c: inventory.site_address_c
      }
    };
  });
}

// Rota para verificar inventários
app.get('/api/inventory-check', async (req, res) => {
  try {
    const response = await axios.post(ZABBIX_URL, {
      jsonrpc: "2.0",
      method: "host.get",
      params: {
        output: ["hostid", "host", "name"],
        selectInventory: ["location", "location_lat", "location_lon", "site_address_a", "site_address_b", "site_address_c"],
        filter: { status: 0 },
        limit: 20
      },
      auth: ZABBIX_TOKEN,
      id: 10
    }, { httpsAgent });

    const hosts = response.data.result || [];
    
    const inventoryInfo = hosts.map(host => ({
      name: host.name || host.host,
      inventory: host.inventory || {},
      has_coords: !!(host.inventory && host.inventory.location_lat && host.inventory.location_lon)
    }));

    res.json({
      total: hosts.length,
      with_coordinates: inventoryInfo.filter(h => h.has_coords).length,
      hosts: inventoryInfo
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Estatísticas atualizadas
app.get('/api/stats', async (req, res) => {
  try {
    if (!ZABBIX_URL || !ZABBIX_TOKEN) {
      return res.json({
        totalDevices: 2,
        online: 1,
        warnings: 1,
        offline: 0,
        states: 2,
        withCoordinates: 0
      });
    }

    // Buscar hosts do grupo Aruba para estatísticas
    const arubaGroupId = await getArubaGroupId();
    let hosts = [];

    if (arubaGroupId) {
      const response = await axios.post(ZABBIX_URL, {
        jsonrpc: "2.0",
        method: "host.get",
        params: {
          output: ["hostid", "status", "available"],
          selectInventory: ["location_lat", "location_lon"],
          groupids: [arubaGroupId],
          filter: { status: 0 }
        },
        auth: ZABBIX_TOKEN,
        id: 3
      }, { httpsAgent });

      hosts = response.data.result || [];
    }

    const total = hosts.length;
    const withCoordinates = hosts.filter(h => 
      h.inventory && h.inventory.location_lat && h.inventory.location_lon
    ).length;
    
    // Calcular status reais
    const online = hosts.filter(h => h.status === 0 && h.available === '1').length;
    const warnings = hosts.filter(h => h.status === 0 && h.available === '0').length;
    const offline = hosts.filter(h => h.status === 1).length;

    res.json({
      totalDevices: total,
      online: online,
      warnings: warnings,
      offline: offline,
      states: 10,
      withCoordinates: withCoordinates
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error.message);
    res.json({
      totalDevices: 2,
      online: 1,
      warnings: 1,
      offline: 0,
      states: 2,
      withCoordinates: 0
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
      hasExactCoords: false,
      lastCheck: new Date().toISOString(),
      groups: ['Zabbix servers'],
      description: 'Servidor Zabbix principal'
    },
    { 
      id: '10085', 
      name: 'Aruba Router SP', 
      type: 'router', 
      status: 'warning', 
      state: 'SP', 
      location: 'São Paulo, SP',
      ip: '172.17.17.1',
      lat: -23.5505, 
      lon: -46.6333,
      hasExactCoords: true,
      lastCheck: new Date().toISOString(),
      groups: ['Roteadores Aruba'],
      description: 'Roteador Aruba São Paulo'
    },
    { 
      id: '10086', 
      name: 'Aruba Router RJ', 
      type: 'router', 
      status: 'online', 
      state: 'RJ', 
      location: 'Rio de Janeiro, RJ',
      ip: '172.17.17.2',
      lat: -22.9068, 
      lon: -43.1729,
      hasExactCoords: true,
      lastCheck: new Date().toISOString(),
      groups: ['Roteadores Aruba'],
      description: 'Roteador Aruba Rio de Janeiro'
    }
  ];
}

// Token test
app.get('/api/token-test', (req, res) => {
  res.json({
    zabbix_url: ZABBIX_URL || 'not set',
    has_token: !!ZABBIX_TOKEN,
    server_ip: SERVER_IP || 'not set',
    backend_version: '1.0.1'
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor backend rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}/health`);
  console.log(`🔍 Dispositivos: http://localhost:${PORT}/api/devices`);
  console.log(`📊 Estatísticas: http://localhost:${PORT}/api/stats`);
});
