import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5010';

export default function () {
  const payload = JSON.stringify({
    email: 'admin@archiflow.local',
    password: 'Admin1234!',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);
  check(res, {
    'login status 200': (r) => r.status === 200,
    'has access token': (r) => r.json('token.access_token') !== '',
    'has refresh token cookie': (r) => r.cookies['archiflow_refresh'] !== undefined,
  });

  sleep(1);
}