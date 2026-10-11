import { randomUUID } from 'node:crypto';
import { database, migrate, transaction } from '../lib/database';
import { passwordHash } from '../lib/coordinator';

/** One-time remote bootstrap. No local file writes or default public credentials. */
async function main() {
  if (process.env.AGRIROUTE_HOSTED_SETUP !== 'I_UNDERSTAND') throw new Error('Explicit AGRIROUTE_HOSTED_SETUP approval required');
  if (!process.env.DATABASE_URL?.startsWith('postgresql://')) throw new Error('Provide a PostgreSQL DATABASE_URL through a protected environment');
  const origin = new URL(process.env.APP_ORIGIN ?? '');
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('APP_ORIGIN must be the exact production HTTPS origin');
  const email = process.env.AGRIROUTE_ADMIN_EMAIL;
  const password = process.env.AGRIROUTE_ADMIN_PASSWORD;
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !password || password.length < 16) throw new Error('Set private AGRIROUTE_ADMIN_EMAIL and AGRIROUTE_ADMIN_PASSWORD (16+ chars)');
  await migrate();
  const existing = await database().query('SELECT COUNT(*)::integer AS count FROM ar_users');
  if (existing.rows[0].count !== 0) throw new Error('Accounts exist; refuse automated bootstrap');
  await transaction(async client => {
    const tenantId = randomUUID();
    await client.query('INSERT INTO ar_tenants(id,name) VALUES($1,$2)', [tenantId,'AgriRoute AI demonstration']);
    await client.query('INSERT INTO ar_users(id,tenant_id,id_email,name,role,password_hash) VALUES($1,$2,$3,$4,$5,$6)', [randomUUID(),tenantId,email.toLowerCase(),'AgriRoute Coordinator','coordinator',passwordHash(password)]);
  });
  console.log('Hosted PostgreSQL schema and one coordinator account created. No credentials printed or committed.');
  await database().end();
}
void main().catch(error => { console.error('Hosted database bootstrap stopped:',error instanceof Error?error.message:'Unexpected failure'); process.exitCode = 1; });
