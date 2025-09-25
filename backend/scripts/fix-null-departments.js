require('dotenv').config();
const { supabaseAdmin } = require('../dist/utils/supabase');

async function fixNullDepartments() {
  try {
    console.log('Fixing employees with null department_id...');
    
    // Get Operations department ID (as default)
    const { data: opsDept, error: deptError } = await supabaseAdmin
      .from('departments')
      .select('id')
      .eq('name', 'Operations')
      .single();
    
    if (deptError) {
      console.error('Error fetching Operations department:', deptError);
      return;
    }
    
    console.log('Operations Department ID:', opsDept.id);
    
    // Update all employees with null department_id to Operations
    const { data: updatedEmployees, error: updateError } = await supabaseAdmin
      .from('employees')
      .update({ department_id: opsDept.id })
      .is('department_id', null)
      .select('id, full_name');
    
    if (updateError) {
      console.error('Error updating employees:', updateError);
      return;
    }
    
    console.log(`Successfully updated ${updatedEmployees.length} employees to Operations department:`);
    updatedEmployees.forEach(emp => {
      console.log(`- ${emp.full_name}`);
    });
    
    // Verify no employees have null department_id
    const { data: nullEmployees, error: checkError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name')
      .is('department_id', null);
    
    if (checkError) {
      console.error('Error checking for null departments:', checkError);
      return;
    }
    
    console.log(`\nRemaining employees with null department_id: ${nullEmployees.length}`);
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

fixNullDepartments();