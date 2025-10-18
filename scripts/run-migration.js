/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('begin');
    const dir = path.join(__dirname, '..', 'db', 'migrations');
    const files = fs
      .readdirSync(dir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    for (const f of files) {
      const full = path.join(dir, f);
      const sql = fs.readFileSync(full, 'utf8');
      console.log('Applying migration', f);
      await client.query(sql);
    }
    await client.query('commit');
    console.log('Migrations applied successfully');
  } catch (e) {
    await client.query('rollback');
    console.error('Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
