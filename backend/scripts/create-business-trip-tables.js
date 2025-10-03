const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.log('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBusinessTripTables() {
  try {
    console.log('Creating business trip tables...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../database/create_business_trip_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Check if tables already exist
    const { data: existingTables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['business_trip_requests', 'business_trip_events', 'business_trip_participants']);
    
    if (checkError) {
      console.error('Error checking existing tables:', checkError);
    } else if (existingTables && existingTables.length > 0) {
      console.log('Business trip tables already exist:', existingTables.map(t => t.table_name));
      console.log('Skipping table creation.');
      return;
    }
    
    // Execute the SQL to create tables
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error creating business trip tables:', error);
      console.log('\nPlease run the following SQL manually in your Supabase SQL Editor:');
      console.log('\n' + sql);
    } else {
      console.log('✅ Business trip tables created successfully!');
      
      // Verify tables were created
      const { data: newTables, error: verifyError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['business_trip_requests', 'business_trip_events', 'business_trip_participants']);
      
      if (verifyError) {
        console.error('Error verifying tables:', verifyError);
      } else {
        console.log('Verified tables created:', newTables?.map(t => t.table_name) || []);
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    console.log('\nIf the automatic creation fails, please run the SQL manually in Supabase:');
    console.log('1. Open your Supabase project dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Copy and paste the contents of backend/database/create_business_trip_tables.sql');
    console.log('4. Execute the SQL');
  }
}

createBusinessTripTables();