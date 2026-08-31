import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5010';
let authToken = '';

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

  // Test cursor pagination
  let cursor = null;
  for (let i = 0; i < 5; i++) {
    const url = cursor
      ? `${BASE_URL}/api/documents/my?limit=50&cursor_id=${cursor.id}&cursor_created_at=${cursor.created_at}`
      : `${BASE_URL}/api/documents/my?limit=50`;

    const res = http.get(url, { headers });
    check(res, {
      'documents list status 200': (r) => r.status === 200,
      'has documents array': (r) => Array.isArray(r.json('documents')),
      'has next_cursor': (r) => r.json('next_cursor') !== undefined,
    });

    const nextCursor = res.json('next_cursor');
    if (!nextCursor) break;
    cursor = nextCursor;
    sleep(0.1);
  }

  sleep(0.5);
}