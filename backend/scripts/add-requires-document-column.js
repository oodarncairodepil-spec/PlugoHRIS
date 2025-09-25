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

async function addRequiresDocumentColumn() {
  try {
    console.log('🚀 Adding requires_document column to leave_types table...');
    
    // Try to fetch a leave type to check if the column exists
    const { data: testData, error: testError } = await supabase
      .from('leave_types')
      .select('id, name, requires_document')
      .limit(1);
    
    if (!testError && testData) {
      console.log('✅ Column requires_document already exists!');
      
      // Update existing leave types that should require documents
      const { error: updateError } = await supabase
        .from('leave_types')
        .update({ requires_document: true })
        .in('name', ['Sick Leave', 'Maternity Leave', 'Paternity Leave']);
      
      if (updateError) {
        console.error('❌ Error updating existing leave types:', updateError);
      } else {
        console.log('✅ Updated existing leave types that require documents!');
      }
      return;
    }
    
    // If we get here, the column doesn't exist
    console.log('⚠️  Column does not exist. Please manually add it using Supabase SQL Editor:');
    console.log('');
    console.log('-- Add requires_document column to leave_types table');
    console.log('ALTER TABLE leave_types ADD COLUMN requires_document BOOLEAN DEFAULT false;');
    console.log('');
    console.log('-- Update existing leave types that might require documents');
    console.log("UPDATE leave_types SET requires_document = true WHERE name IN ('Sick Leave', 'Maternity Leave', 'Paternity Leave');");
    console.log('');
    console.log('-- Add comment to document the purpose of this column');
    console.log("COMMENT ON COLUMN leave_types.requires_document IS 'Indicates whether this leave type requires supporting documents/images';");
    
  } catch (err) {
    console.error('❌ Fatal error:', err);
  }
}

addRequiresDocumentColumn();