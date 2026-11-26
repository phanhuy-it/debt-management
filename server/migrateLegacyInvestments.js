import 'dotenv/config';
import pg from 'pg';
import { migrateLegacyInvestments } from './legacyInvestments.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, enableChannelBinding: true });

try {
  await client.connect();
  await client.query('CREATE TABLE IF NOT EXISTS public.debt_app_legacy_investments (id uuid PRIMARY KEY)');
  const migrated = await migrateLegacyInvestments(client);
  console.log(`Đã chuyển ${migrated} giao dịch; bảng investments vẫn được giữ nguyên.`);
} catch (error) {
  console.error('Không thể chuyển dữ liệu đầu tư:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
