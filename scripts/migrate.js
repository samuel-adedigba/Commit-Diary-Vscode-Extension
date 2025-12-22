#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = resolve(__dirname, '../packages/api/.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && !key.startsWith('#')) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in packages/api/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigrations() {
  console.log('🚀 Running Migrations');
  console.log('====================\n');

  const migrationsDir = resolve(__dirname, '../supabase/migrations');
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  console.log(`📁 Found ${files.length} migration(s)\n`);

  for (const file of files) {
    console.log(`📄 Executing: ${file}`);
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    
    try {
      // Execute raw SQL using Supabase REST API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ query: sql })
      });

      if (!response.ok) {
        // Try alternative approach - split and execute statements
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
          const { error } = await supabase.rpc('exec', { sql: statement });
          if (error) throw error;
        }
      }
      
      console.log(`   ✅ Success\n`);
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}\n`);
      process.exit(1);
    }
  }

  console.log('════════════════════════════════════════');
  console.log('✅ All migrations completed successfully!');
  console.log('════════════════════════════════════════\n');
  console.log(`🔗 View tables: ${SUPABASE_URL.replace('//', '//app.')}/project/*/editor`);
}

runMigrations().catch(console.error);
