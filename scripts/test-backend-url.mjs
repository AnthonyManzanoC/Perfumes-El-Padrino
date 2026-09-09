import assert from 'node:assert/strict';
import { getBackendUrl } from '../lib/backend-url.mjs';

assert.equal(getBackendUrl({ NODE_ENV: 'development' }), 'http://localhost:5190');
assert.equal(getBackendUrl({ NODE_ENV: 'production', VERCEL: '1' }), 'https://perfumes-el-padrino-api.onrender.com');
assert.equal(getBackendUrl({ API_URL: 'https://example.com/' }), 'https://example.com');
assert.equal(getBackendUrl({ NEXT_PUBLIC_API_URL: 'https://legacy.example.com' }), 'https://legacy.example.com');
assert.equal(getBackendUrl({ API_URL: 'https://preferred.example.com', NEXT_PUBLIC_API_URL: 'https://legacy.example.com' }), 'https://preferred.example.com');
for (const API_URL of ['http://localhost:5190', 'http://127.0.0.1:5190', 'http://[::1]:5190', 'http://example.com'])
  assert.throws(() => getBackendUrl({ VERCEL: '1', API_URL }));
for (const API_URL of ['postgresql://example.com/db', 'https://user:secret@example.com', 'https://example.com?key=test'])
  assert.throws(() => getBackendUrl({ API_URL }));
console.log('Backend URL: todas las comprobaciones pasaron.');
