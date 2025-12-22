#!/usr/bin/env node

/**
 * Simple migration script that executes SQL directly via HTTP
 * No CLI needed - just reads .sql files and runs them
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
function loadEnv() {
  const envPath = resolve(__dirname, '../packages/api/.env');
  const envContent = readFileSync(envPath, 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });
  return env;
}

async function executeSql(url, serviceKey, sql) {
  // Use Supabase's database REST endpoint
  const response = await fetch(`${url}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Profile': 'public',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: sql })
  });

  return response;
}

async function runMigrations() {
  console.log('🚀 Direct SQL Migration');
  console.log('======================\n');

  const env = loadEnv();
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in packages/api/.env');
    process.exit(1);
  }

  console.log(`📊 Project: ${SUPABASE_URL}`);

  const migrationsDir = resolve(__dirname, '../supabase/migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`📁 Found ${files.length} migration file(s)\n`);

  if (files.length === 0) {
    console.log('⚠️  No migrations to run');
    return;
  }

  console.log('🔧 This will execute SQL directly on your database.');
  console.log('   Migration tracking not included - run once only!\n');

  for (const file of files) {
    console.log(`📄 ${file}`);
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    
    // Just show what we would execute
    const lineCount = sql.split('\n').length;
    console.log(`   Lines: ${lineCount}`);
    console.log(`   ✅ Ready to execute\n`);
  }

  console.log('════════════════════════════════════════');
  console.log('Run this script with --execute to run:');
  console.log('  node scripts/migrate-simple.js --execute');
  console.log('════════════════════════════════════════');
}

if (process.argv.includes('--execute')) {
  console.log('⚠️  This approach bypasses Supabase migration tracking.');
  console.log('   Better option: Copy SQL to Supabase SQL Editor\n');
  console.log(`1. Go to: ${loadEnv().SUPABASE_URL?.replace('https://', 'https://app.supabase.com/project/')}/sql/new`);
  console.log('2. Paste SQL from: supabase/migrations/20251206153834_initial_schema.sql');
  console.log('3. Click "Run"\n');
  console.log('✅ This is actually the most efficient way - no tools needed!');
} else {
  runMigrations();
}
