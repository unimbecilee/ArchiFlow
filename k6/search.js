import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<600'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5010';
const queries = ['contract', 'invoice', 'report', 'meeting', 'budget', 'project', 'client', 'document'];

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
    'Content-Type': 'application/json',
  };

  const query = queries[Math.floor(Math.random() * queries.length)];
  const res = http.get(`${BASE_URL}/api/documents/search?q=${query}&mode=fts`, { headers });

  check(res, {
    'search status 200': (r) => r.status === 200,
    'has results': (r) => Array.isArray(r.json('documents')),
  });

  sleep(0.5);
}