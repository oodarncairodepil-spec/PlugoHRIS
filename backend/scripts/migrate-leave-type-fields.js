const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateLeaveTypeFields() {
  try {
    console.log('Starting leave type fields migration...');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '../database/add_leave_type_fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing SQL migration...');
    
    // Try to execute via RPC first
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: sql
      });
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Migration completed successfully via RPC!');
      console.log('Migration result:', data);
      
    } catch (rpcError) {
      console.log('❌ RPC execution failed:', rpcError.message);
      console.log('\n📋 Please execute the following SQL commands manually in Supabase SQL Editor:');
      console.log('=' .repeat(80));
      console.log(sql);
      console.log('=' .repeat(80));
      console.log('\n📝 Steps to execute manually:');
      console.log('1. Go to your Supabase project dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the SQL commands above');
      console.log('4. Click "Run" to execute the migration');
      console.log('5. Verify the changes by checking the leave_types table structure');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateLeaveTypeFields();