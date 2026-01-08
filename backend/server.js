const express = require('express');
const cors = require('cors');

const app = express();

// CORS completo
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// Middleware de logs
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Dados MOCK
const devices = [
    { id: 1, name: "Servidor SP", lat: -23.5505, lng: -46.6333, status: "online", city: "São Paulo" },
    { id: 2, name: "Router RJ", lat: -22.9068, lng: -43.1729, status: "online", city: "Rio de Janeiro" },
    { id: 3, name: "Switch BH", lat: -19.9167, lng: -43.9345, status: "warning", city: "Belo Horizonte" },
    { id: 4, name: "Firewall DF", lat: -15.7801, lng: -47.9292, status: "online", city: "Brasília" },
    { id: 5, name: "Servidor POA", lat: -30.0346, lng: -51.2177, status: "offline", city: "Porto Alegre" },
];

// Health check
app.get('/health', (req, res) => {
    const healthData = {
        status: 'healthy',
        service: 'Zabbix Map Backend',
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 3000,
        host: process.env.HOST || '0.0.0.0',
        endpoints: ['/api/devices', '/health', '/'],
        network: {
            ip: req.ip,
            hostname: req.hostname,
            protocol: req.protocol
        }
    };
    console.log('Health check:', healthData);
    res.json(healthData);
});

// API principal
app.get('/api/devices', (req, res) => {
    console.log('API Devices chamada');
    res.json({
        success: true,
        data: devices,
        count: devices.length,
        server: `Porta ${process.env.PORT || 3000}`,
        accessed_at: new Date().toISOString()
    });
});

// Rota raiz
app.get('/', (req, res) => {
    res.json({
        name: 'Zabbix Map API',
        version: '1.0.0',
        description: 'API para mapa de dispositivos Zabbix',
        endpoints: {
            devices: '/api/devices',
            health: '/health'
        }
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log('='.repeat(50));
    console.log('🚀 ZABBIX MAP BACKEND INICIADO');
    console.log('='.repeat(50));
    console.log(`📡 Servidor: http://${HOST}:${PORT}`);
    console.log(`🏥 Health:   http://${HOST}:${PORT}/health`);
    console.log(`🗺️  API:      http://${HOST}:${PORT}/api/devices`);
    console.log(`⚙️  Ambiente: ${process.env.NODE_ENV}`);
    console.log('='.repeat(50));
});
