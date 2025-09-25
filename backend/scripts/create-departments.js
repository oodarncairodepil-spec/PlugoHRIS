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

async function createDepartments() {
  try {
    console.log('🚀 Creating departments table...');
    
    // Create departments table
    const { error: deptError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS departments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL UNIQUE,
          details TEXT,
          head_id UUID REFERENCES employees(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (deptError) {
      console.log('⚠️  Departments table creation via RPC failed:', deptError);
      console.log('📝 Trying alternative approach...');
      
      // Try using direct SQL execution if RPC fails
      // Insert sample departments directly
      const sampleDepartments = [
        { name: 'Human Resources', details: 'Manages employee relations, recruitment, and HR policies' },
        { name: 'Information Technology', details: 'Handles all technology infrastructure and software development' },
        { name: 'Finance', details: 'Manages company finances, accounting, and budgeting' },
        { name: 'Marketing', details: 'Responsible for marketing campaigns and brand management' },
        { name: 'Operations', details: 'Oversees daily operations and process optimization' }
      ];
      
      // Check if departments table exists by trying to select from it
      const { data: existingDepts, error: selectError } = await supabase
        .from('departments')
        .select('id')
        .limit(1);
      
      if (selectError && selectError.code === 'PGRST106') {
        console.log('❌ Departments table does not exist. Please create it manually in Supabase dashboard.');
        console.log('📋 Use this SQL in Supabase SQL Editor:');
        console.log(`
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  details TEXT,
  head_id UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE department_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  position VARCHAR(100),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(department_id, employee_id)
);

ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);

CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_departments_head_id ON departments(head_id);
CREATE INDEX IF NOT EXISTS idx_department_employees_dept_id ON department_employees(department_id);
CREATE INDEX IF NOT EXISTS idx_department_employees_emp_id ON department_employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
`);
        return;
      }
      
      // If table exists, insert sample data
      const { error: insertError } = await supabase
        .from('departments')
        .insert(sampleDepartments);
      
      if (insertError) {
        console.log('⚠️  Sample departments may already exist:', insertError.message);
      } else {
        console.log('✅ Sample departments inserted successfully!');
      }
      
    } else {
      console.log('✅ Departments table created successfully!');
      
      // Insert sample departments
      const sampleDepartments = [
        { name: 'Human Resources', details: 'Manages employee relations, recruitment, and HR policies' },
        { name: 'Information Technology', details: 'Handles all technology infrastructure and software development' },
        { name: 'Finance', details: 'Manages company finances, accounting, and budgeting' },
        { name: 'Marketing', details: 'Responsible for marketing campaigns and brand management' },
        { name: 'Operations', details: 'Oversees daily operations and process optimization' }
      ];
      
      const { error: insertError } = await supabase
        .from('departments')
        .insert(sampleDepartments);
      
      if (insertError) {
        console.log('⚠️  Sample departments insertion failed:', insertError.message);
      } else {
        console.log('✅ Sample departments inserted successfully!');
      }
    }
    
    console.log('🎉 Department setup completed!');
    
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

createDepartments();