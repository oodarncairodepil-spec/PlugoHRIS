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

async function removeDivisionColumn() {
  try {
    console.log('🚀 Checking employees table structure...');
    
    // Try to select from employees table to see current structure
    const { data: employees, error: selectError } = await supabase
      .from('employees')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.log('⚠️  Error querying employees table:', selectError.message);
      return;
    }
    
    if (employees && employees.length > 0) {
      const columns = Object.keys(employees[0]);
      console.log('📋 Current columns in employees table:', columns);
      
      if (columns.includes('division')) {
        console.log('⚠️  Division column still exists in the table.');
        console.log('📝 Note: The column needs to be removed manually through Supabase dashboard or direct SQL access.');
        console.log('💡 SQL command to run: ALTER TABLE employees DROP COLUMN division;');
      } else {
        console.log('✅ Division column has already been removed from the employees table!');
      }
    } else {
      console.log('📝 No employees found in the table to check structure.');
    }
    
  } catch (error) {
    console.log('⚠️  Error:', error.message);
  }
}

removeDivisionColumn();