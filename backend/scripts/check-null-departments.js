require('dotenv').config();
const { supabaseAdmin } = require('../dist/utils/supabase');

async function checkNullDepartments() {
  try {
    console.log('Checking for employees with null department_id...');
    
    const { data: employees, error } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, department_id')
      .is('department_id', null);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log(`Found ${employees.length} employees with null department_id:`);
    employees.forEach(emp => {
      console.log(`- ${emp.full_name} (ID: ${emp.id})`);
    });
    
    // Also check all employees and their department status
    const { data: allEmployees, error: allError } = await supabaseAdmin
      .from('employees')
      .select(`
        id, full_name, department_id,
        department:department_id(id, name)
      `);
    
    if (allError) {
      console.error('Error fetching all employees:', allError);
      return;
    }
    
    console.log('\nAll employees department status:');
    allEmployees.forEach(emp => {
      const deptStatus = emp.department ? emp.department.name : 'NULL DEPARTMENT';
      console.log(`- ${emp.full_name}: ${deptStatus}`);
    });
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

checkNullDepartments();