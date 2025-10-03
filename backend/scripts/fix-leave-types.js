const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.log('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixLeaveTypesTable() {
  try {
    console.log('Fixing leave_types table...');
    
    // Check current table structure
    console.log('Checking current leave_types structure...');
    const { data: currentTypes, error: fetchError } = await supabase
      .from('leave_types')
      .select('*')
      .limit(1);
    
    if (fetchError) {
      console.error('Error fetching leave types:', fetchError);
      return;
    }
    
    console.log('Current leave_types columns:', Object.keys(currentTypes[0] || {}));
    
    // Try to add missing columns using individual ALTER TABLE statements
    const alterStatements = [
      'ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS requires_document BOOLEAN DEFAULT false',
      'ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true',
      'ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT \'Subtraction\' CHECK (type IN (\'Addition\', \'Subtraction\'))',
      'ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS value DECIMAL(5,2) DEFAULT 0.00'
    ];
    
    for (const statement of alterStatements) {
      console.log('Executing:', statement);
      const { error } = await supabase.rpc('exec', { sql: statement });
      if (error) {
        console.log('Note: Column might already exist or statement failed:', error.message);
      }
    }
    
    // Update existing records with appropriate values
    console.log('Updating existing leave types...');
    
    const leaveTypeUpdates = [
      {
        name: 'Annual Leave',
        requires_document: false,
        is_active: true,
        type: 'Subtraction',
        value: 1.00
      },
      {
        name: 'Sick Leave',
        requires_document: true,
        is_active: true,
        type: 'Subtraction',
        value: 1.00
      },
      {
        name: 'Emergency Leave',
        requires_document: false,
        is_active: true,
        type: 'Subtraction',
        value: 1.00
      },
      {
        name: 'Maternity Leave',
        requires_document: true,
        is_active: true,
        type: 'Subtraction',
        value: 90.00
      },
      {
        name: 'Paternity Leave',
        requires_document: true,
        is_active: true,
        type: 'Subtraction',
        value: 14.00
      }
    ];
    
    for (const update of leaveTypeUpdates) {
      const { error } = await supabase
        .from('leave_types')
        .update({
          requires_document: update.requires_document,
          is_active: update.is_active,
          type: update.type,
          value: update.value
        })
        .eq('name', update.name);
      
      if (error) {
        console.log(`Note: Could not update ${update.name}:`, error.message);
      } else {
        console.log(`✅ Updated ${update.name}`);
      }
    }
    
    // Verify the final structure
    console.log('\nVerifying final structure...');
    const { data: finalTypes, error: finalError } = await supabase
      .from('leave_types')
      .select('name, requires_document, is_active, type, value')
      .order('name');
    
    if (finalError) {
      console.error('Error verifying final structure:', finalError);
    } else {
      console.log('\nFinal leave types:');
      console.table(finalTypes);
    }
    
    console.log('\n✅ Leave types table fix completed!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
    console.log('\nIf the automatic fix fails, please run the following SQL manually in Supabase:');
    console.log('1. Open your Supabase project dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Copy and paste the contents of backend/fix_leave_types_table.sql');
    console.log('4. Execute the SQL');
  }
}

fixLeaveTypesTable();