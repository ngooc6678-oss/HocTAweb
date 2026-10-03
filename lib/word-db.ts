import { env } from 'cloudflare:workers';
export function wordDb() { if (!env.DB) throw new Error('Kho từ vựng chưa sẵn sàng.'); return env.DB; }
