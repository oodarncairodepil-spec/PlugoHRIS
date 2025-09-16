const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function runSqlFile(filePath) {
  try {
    const fullPath = path.resolve(filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(fullPath, 'utf8');
    console.log(`🚀 Running SQL file: ${filePath}`);
    console.log(`📄 SQL content:\n${sql}`);
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Error executing SQL:', error);
      process.exit(1);
    }
    
    console.log('✅ SQL executed successfully!');
    if (data) {
      console.log('📊 Result:', data);
    }
    
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('❌ Please provide a SQL file path');
  console.log('Usage: node run-sql.js <path-to-sql-file>');
  process.exit(1);
}

runSqlFile(filePath);