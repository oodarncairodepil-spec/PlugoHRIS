const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function migrateLeaveBalanceColumn() {
  try {
    console.log('🔄 Starting leave_balance column migration...');
    
    // Step 1: Add a temporary column with DECIMAL type
    console.log('📝 Adding temporary decimal column...');
    const { error: addColumnError } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE employees ADD COLUMN leave_balance_temp DECIMAL(5,2);'
    });
    
    if (addColumnError) {
      console.log('⚠️  RPC failed, trying direct SQL execution...');
      // If RPC fails, we'll need to do this manually in Supabase SQL Editor
      console.log('\n📋 Please execute the following SQL commands in Supabase SQL Editor:');
      console.log('\n-- Step 1: Add temporary decimal column');
      console.log('ALTER TABLE employees ADD COLUMN leave_balance_temp DECIMAL(5,2);');
      console.log('\n-- Step 2: Copy data from integer to decimal column');
      console.log('UPDATE employees SET leave_balance_temp = leave_balance::DECIMAL(5,2);');
      console.log('\n-- Step 3: Drop old integer column');
      console.log('ALTER TABLE employees DROP COLUMN leave_balance;');
      console.log('\n-- Step 4: Rename decimal column to original name');
      console.log('ALTER TABLE employees RENAME COLUMN leave_balance_temp TO leave_balance;');
      console.log('\n-- Step 5: Set default value');
      console.log('ALTER TABLE employees ALTER COLUMN leave_balance SET DEFAULT 0.00;');
      console.log('\n-- Step 6: Add NOT NULL constraint if needed');
      console.log('ALTER TABLE employees ALTER COLUMN leave_balance SET NOT NULL;');
      console.log('\n⚠️  After running these commands, restart your backend server to see the changes.');
      return;
    }
    
    console.log('✅ Temporary column added');
    
    // Step 2: Copy data from integer column to decimal column
    console.log('📋 Copying data to decimal column...');
    const { error: copyDataError } = await supabase.rpc('exec_sql', {
      sql_query: 'UPDATE employees SET leave_balance_temp = leave_balance::DECIMAL(5,2);'
    });
    
    if (copyDataError) {
      console.error('❌ Error copying data:', copyDataError.message);
      return;
    }
    
    console.log('✅ Data copied successfully');
    
    // Step 3: Drop the old integer column
    console.log('🗑️  Dropping old integer column...');
    const { error: dropColumnError } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE employees DROP COLUMN leave_balance;'
    });
    
    if (dropColumnError) {
      console.error('❌ Error dropping old column:', dropColumnError.message);
      return;
    }
    
    console.log('✅ Old column dropped');
    
    // Step 4: Rename the temporary column to the original name
    console.log('🔄 Renaming temporary column...');
    const { error: renameColumnError } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE employees RENAME COLUMN leave_balance_temp TO leave_balance;'
    });
    
    if (renameColumnError) {
      console.error('❌ Error renaming column:', renameColumnError.message);
      return;
    }
    
    console.log('✅ Column renamed successfully');
    
    // Step 5: Set default value
    console.log('⚙️  Setting default value...');
    const { error: defaultError } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE employees ALTER COLUMN leave_balance SET DEFAULT 0.00;'
    });
    
    if (defaultError) {
      console.error('❌ Error setting default:', defaultError.message);
      return;
    }
    
    console.log('✅ Default value set');
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('📝 The leave_balance column now supports decimal values (e.g., 21.25)');
    console.log('🔄 Please restart your backend server to see the changes.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

migrateLeaveBalanceColumn();