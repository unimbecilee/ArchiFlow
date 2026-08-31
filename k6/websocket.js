import http from 'k6/http';
import { check, sleep } from 'k6';
import ws from 'k6/ws';

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 500 },
    { duration: '30s', target: 1000 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ws_connecting: ['avg<100'],
    ws_session_duration: ['avg>30000'],
    ws_messages_received: ['count>100'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5010';

export function setup() {
  const payload = JSON.stringify({
    email: 'admin@archiflow.local',
    password: 'Admin1234!',
  });
  const res = http.post(`${BASE_URL}/api/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return { token: res.json('token.access_token') };
}

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
  };

  // Get WS ticket
  const ticketRes = http.post(`${BASE_URL}/api/ws/ticket`, null, { headers });
  check(ticketRes, { 'ticket status 200': (r) => r.status === 200 });
  const ticket = ticketRes.json('ticket');

  // Connect to WebSocket
  const wsUrl = `${BASE_URL.replace('http', 'ws')}/api/ws?ticket=${ticket}`;
  ws.connect(wsUrl, {}, (socket) => {
    socket.on('open', () => {
      console.log('WS connected');
    });

    socket.on('message', (msg) => {
      // Count messages
    });

    socket.on('close', () => {
      console.log('WS closed');
    });

    socket.setTimeout(() => {
      socket.close();
    }, 30000);
  });

  sleep(30);
}