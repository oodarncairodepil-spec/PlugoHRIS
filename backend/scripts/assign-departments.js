require('dotenv').config();
const { supabaseAdmin } = require('../dist/utils/supabase');

async function assignDepartments() {
  try {
    console.log('Assigning departments to employees...');
    
    // Get all departments
    const { data: departments, error: deptError } = await supabaseAdmin
      .from('departments')
      .select('*');
    
    if (deptError) {
      console.error('Error fetching departments:', deptError);
      return;
    }
    
    console.log('Available departments:', departments.map(d => `${d.name} (${d.id})`));
    
    // Get all employees with null department_id
    const { data: employees, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, role, position')
      .is('department_id', null);
    
    if (empError) {
      console.error('Error fetching employees:', empError);
      return;
    }
    
    console.log(`Found ${employees.length} employees without departments`);
    
    // Department assignment logic based on role/position
    const departmentMap = {
      'Information Technology': departments.find(d => d.name === 'Information Technology')?.id,
      'Human Resources': departments.find(d => d.name === 'Human Resources')?.id,
      'Operations': departments.find(d => d.name === 'Operations')?.id,
      'Marketing': departments.find(d => d.name === 'Marketing')?.id,
      'Finance': departments.find(d => d.name === 'Finance')?.id,
      'Product': departments.find(d => d.name === 'Product')?.id
    };
    
    // Default department (IT for now)
    const defaultDepartmentId = departmentMap['Information Technology'];
    
    // Assign departments based on names/roles (this is a simple heuristic)
    const assignments = [];
    
    for (const employee of employees) {
      let assignedDeptId = defaultDepartmentId; // Default to IT
      
      const name = employee.full_name.toLowerCase();
      const position = (employee.position || '').toLowerCase();
      const role = (employee.role || '').toLowerCase();
      
      // Simple heuristic based on common patterns
      if (name.includes('hr') || position.includes('hr') || position.includes('human')) {
        assignedDeptId = departmentMap['Human Resources'];
      } else if (position.includes('marketing') || position.includes('market')) {
        assignedDeptId = departmentMap['Marketing'];
      } else if (position.includes('finance') || position.includes('accounting')) {
        assignedDeptId = departmentMap['Finance'];
      } else if (position.includes('product') || position.includes('pm')) {
        assignedDeptId = departmentMap['Product'];
      } else if (position.includes('operation') || role.includes('manager')) {
        assignedDeptId = departmentMap['Operations'];
      }
      
      assignments.push({
        id: employee.id,
        name: employee.full_name,
        department_id: assignedDeptId,
        department_name: Object.keys(departmentMap).find(key => departmentMap[key] === assignedDeptId)
      });
    }
    
    console.log('\nProposed assignments:');
    assignments.forEach(a => {
      console.log(`- ${a.name} -> ${a.department_name}`);
    });
    
    // Update employees with their assigned departments
    console.log('\nUpdating employee departments...');
    
    for (const assignment of assignments) {
      const { error: updateError } = await supabaseAdmin
        .from('employees')
        .update({ department_id: assignment.department_id })
        .eq('id', assignment.id);
      
      if (updateError) {
        console.error(`Error updating ${assignment.name}:`, updateError);
      } else {
        console.log(`✓ Updated ${assignment.name} -> ${assignment.department_name}`);
      }
    }
    
    console.log('\nDepartment assignment completed!');
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

assignDepartments();