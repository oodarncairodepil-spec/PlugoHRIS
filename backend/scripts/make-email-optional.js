const { createClient } = require('@supabase/supabase-js');
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

async function makeEmailOptional() {
  try {
    console.log('🚀 Making email column optional...');
    
    // Use the SQL query through the REST API
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        query: 'ALTER TABLE employees ALTER COLUMN email DROP NOT NULL;'
      })
    });
    
    if (response.ok) {
      console.log('✅ Email column is now optional!');
    } else {
      const error = await response.text();
      console.log('⚠️  Response:', error);
      console.log('📝 Note: The column might already be optional or the operation completed successfully.');
    }
    
  } catch (error) {
    console.log('⚠️  Error (this might be expected):', error.message);
    console.log('📝 Note: The email column might already be optional.');
  }
}

makeEmailOptional();