import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.05'],
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

  // Create a 1MB test file
  const fileContent = 'x'.repeat(1024 * 1024);
  const formData = {
    file: http.file(fileContent, 'test-file.pdf', 'application/pdf'),
    folder_id: '1',
  };

  const res = http.post(`${BASE_URL}/api/documents/upload`, formData, { headers });
  check(res, {
    'upload status 201': (r) => r.status === 201,
    'has document id': (r) => r.json('data.id') !== undefined,
  });

  sleep(1);
}