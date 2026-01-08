require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { mockDevices, getDeviceStats } = require('./data/devices.mock.js');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Rota de saúde melhorada
app.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    service: 'Zabbix Map API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    endpoints: [
      { path: '/api/devices', method: 'GET', description: 'Lista todos dispositivos' },
      { path: '/api/devices/:id', method: 'GET', description: 'Busca dispositivo por ID' },
      { path: '/api/stats', method: 'GET', description: 'Estatísticas do sistema' },
      { path: '/health', method: 'GET', description: 'Health check' }
    ]
  };
  
  res.json(healthData);
});

// API principal - Lista todos dispositivos
app.get('/api/devices', (req, res) => {
  try {
    const stats = getDeviceStats(mockDevices);
    
    res.json({
      success: true,
      data: mockDevices,
      meta: {
        count: mockDevices.length,
        stats: stats,
        server: {
          ip: process.env.SERVER_IP || 'localhost',
          port: PORT,
          generatedAt: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar dispositivos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao processar a requisição',
      message: error.message
    });
  }
});

// Busca dispositivo por ID
app.get('/api/devices/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const device = mockDevices.find(d => d.id === id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Dispositivo não encontrado',
        message: `Dispositivo com ID ${id} não existe`
      });
    }
    
    res.json({
      success: true,
      data: device
    });
  } catch (error) {
    console.error('Erro ao buscar dispositivo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao processar a requisição',
      message: error.message
    });
  }
});

// Estatísticas detalhadas
app.get('/api/stats', (req, res) => {
  try {
    const stats = getDeviceStats(mockDevices);
    
    res.json({
      success: true,
      data: stats,
      meta: {
        totalDevices: mockDevices.length,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao processar a requisição',
      message: error.message
    });
  }
});

// Rota raiz - Documentação
app.get('/', (req, res) => {
  res.json({
    name: 'Zabbix Map API',
    version: '1.0.0',
    description: 'API para visualização geográfica de dispositivos Zabbix',
    documentation: {
      endpoints: [
        { path: '/', method: 'GET', description: 'Esta documentação' },
        { path: '/health', method: 'GET', description: 'Verificar saúde do serviço' },
        { path: '/api/devices', method: 'GET', description: 'Listar todos dispositivos' },
        { path: '/api/devices/:id', method: 'GET', description: 'Buscar dispositivo específico' },
        { path: '/api/stats', method: 'GET', description: 'Obter estatísticas' }
      ],
      repository: 'https://github.com/lucasmagno-eg/zabbix-map-portainer'
    }
  });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
    message: `A rota ${req.method} ${req.url} não existe`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/devices',
      'GET /api/devices/:id',
      'GET /api/stats'
    ]
  });
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Ocorreu um erro inesperado',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Iniciar servidor
app.listen(PORT, HOST, () => {
  console.log('='.repeat(60));
  console.log('🚀 ZABBIX MAP API INICIADA COM SUCESSO');
  console.log('='.repeat(60));
  console.log(`📍 Servidor: http://${HOST}:${PORT}`);
  console.log(`🏥 Health:   http://${HOST}:${PORT}/health`);
  console.log(`🗺️  API:      http://${HOST}:${PORT}/api/devices`);
  console.log(`⚙️  Ambiente: ${process.env.NODE_ENV}`);
  console.log('='.repeat(60));
  
  // Log das variáveis de ambiente (sem valores sensíveis)
  console.log('Variáveis de ambiente:');
  console.log(`- PORT: ${PORT}`);
  console.log(`- HOST: ${HOST}`);
  console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`- CORS_ORIGIN: ${process.env.CORS_ORIGIN || '*'}`);
  console.log('='.repeat(60));
});
