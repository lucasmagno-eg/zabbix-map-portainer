// Dados mockados de dispositivos no Brasil
// Futuramente substituir por chamada à API do Zabbix

const mockDevices = [
  {
    id: 1,
    name: "Servidor Principal SP",
    host: "srv-sp-01",
    lat: -23.5505,
    lng: -46.6333,
    status: "online",
    city: "São Paulo",
    state: "SP",
    type: "server",
    ip: "192.168.1.100",
    lastSeen: "2024-01-08T10:30:00Z",
    description: "Servidor de aplicação principal"
  },
  {
    id: 2,
    name: "Router Matriz RJ",
    host: "rt-rj-01",
    lat: -22.9068,
    lng: -43.1729,
    status: "online",
    city: "Rio de Janeiro",
    state: "RJ",
    type: "router",
    ip: "192.168.2.1",
    lastSeen: "2024-01-08T10:25:00Z",
    description: "Router principal da matriz"
  },
  {
    id: 3,
    name: "Switch Datacenter BH",
    host: "sw-bh-01",
    lat: -19.9167,
    lng: -43.9345,
    status: "warning",
    city: "Belo Horizonte",
    state: "MG",
    type: "switch",
    ip: "192.168.3.10",
    lastSeen: "2024-01-08T09:45:00Z",
    description: "Switch do datacenter"
  },
  {
    id: 4,
    name: "Firewall Nacional DF",
    host: "fw-df-01",
    lat: -15.7801,
    lng: -47.9292,
    status: "online",
    city: "Brasília",
    state: "DF",
    type: "firewall",
    ip: "192.168.4.1",
    lastSeen: "2024-01-08T10:15:00Z",
    description: "Firewall principal"
  },
  {
    id: 5,
    name: "Servidor Regional POA",
    host: "srv-poa-01",
    lat: -30.0346,
    lng: -51.2177,
    status: "offline",
    city: "Porto Alegre",
    state: "RS",
    type: "server",
    ip: "192.168.5.100",
    lastSeen: "2024-01-07T22:00:00Z",
    description: "Servidor regional"
  },
  {
    id: 6,
    name: "Access Point Manaus",
    host: "ap-ma-01",
    lat: -3.1190,
    lng: -60.0217,
    status: "online",
    city: "Manaus",
    state: "AM",
    type: "access-point",
    ip: "192.168.6.50",
    lastSeen: "2024-01-08T10:10:00Z",
    description: "Access point da filial"
  }
];

// Estatísticas calculadas
function getDeviceStats(devices) {
  return {
    total: devices.length,
    online: devices.filter(d => d.status === "online").length,
    warning: devices.filter(d => d.status === "warning").length,
    offline: devices.filter(d => d.status === "offline").length,
    byType: devices.reduce((acc, device) => {
      acc[device.type] = (acc[device.type] || 0) + 1;
      return acc;
    }, {}),
    byState: devices.reduce((acc, device) => {
      acc[device.state] = (acc[device.state] || 0) + 1;
      return acc;
    }, {})
  };
}

module.exports = {
  mockDevices,
  getDeviceStats
};
