import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 100 },
    { duration: '10s', target: 1000 },
    { duration: '10s', target: 100 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'],
    http_req_failed: ['rate<0.1'],
    checks: ['rate>0.9'],
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

  // Mix of operations
  const ops = ['list', 'search', 'recent', 'trash'];
  const op = ops[Math.floor(Math.random() * ops.length)];

  let res;
  switch (op) {
    case 'list':
      res = http.get(`${BASE_URL}/api/documents/my?limit=20`, { headers });
      check(res, { 'list ok': (r) => r.status === 200 });
      break;
    case 'search':
      res = http.get(`${BASE_URL}/api/documents/search?q=test&limit=10`, { headers });
      check(res, { 'search ok': (r) => r.status === 200 });
      break;
    case 'recent':
      res = http.get(`${BASE_URL}/api/documents/recent?limit=10`, { headers });
      check(res, { 'recent ok': (r) => r.status === 200 });
      break;
    case 'trash':
      res = http.get(`${BASE_URL}/api/documents/trash?limit=10`, { headers });
      check(res, { 'trash ok': (r) => r.status === 200 });
      break;
  }

  sleep(0.1);
}