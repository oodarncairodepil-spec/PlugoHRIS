const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addDocumentLinksColumn() {
  try {
    console.log('Checking if document_links column exists in leave_requests table...');
    
    // Try to select the column to check if it exists
    const { data, error } = await supabase
      .from('leave_requests')
      .select('document_links')
      .limit(1);
    
    if (error && error.message.includes('document_links does not exist')) {
      console.log('Column document_links does not exist. Please run the following SQL commands manually:');
      console.log('');
      console.log('1. Go to your Supabase dashboard > SQL Editor');
      console.log('2. Run the following SQL commands:');
      console.log('');
      console.log('-- Add document_links column to leave_requests table');
      console.log('ALTER TABLE leave_requests ADD COLUMN document_links TEXT[];');
      console.log('');
      console.log('-- Add comment to describe the column');
      console.log('COMMENT ON COLUMN leave_requests.document_links IS \'Array of document URLs/links attached to the leave request\';');
      console.log('');
      console.log('3. Verify the column was added by running:');
      console.log('\\d leave_requests;');
      console.log('');
      console.log('After running these commands, the document_links column will be available for storing document attachments.');
    } else if (error) {
      console.error('Error checking column existence:', error.message);
    } else {
      console.log('Column document_links already exists in leave_requests table.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

addDocumentLinksColumn();