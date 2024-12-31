import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function setupDatabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Read SQL files
  const schemaSQL = fs.readFileSync(path.join(process.cwd(), 'schema.sql'), 'utf8');
  const migrationsSQL = fs.readFileSync(path.join(process.cwd(), 'migrations.sql'), 'utf8');

  console.log('Creating tables...');
  
  // Execute schema.sql
  const { error: schemaError } = await supabase
    .from('_sql')
    .select('*')
    .eq('query', schemaSQL)
    .single();

  if (schemaError) {
    console.error('Error executing schema.sql:', schemaError);
    return;
  }

  console.log('Schema created successfully');

  // Execute migrations.sql
  const { error: migrationsError } = await supabase
    .from('_sql')
    .select('*')
    .eq('query', migrationsSQL)
    .single();

  if (migrationsError) {
    console.error('Error executing migrations.sql:', migrationsError);
    return;
  }

  console.log('Migrations executed successfully');
}

setupDatabase().catch(console.error);
