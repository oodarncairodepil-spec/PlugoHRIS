const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestUsers() {
  try {
    console.log('Creating test users...');
    
    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 12);
    const managerPassword = await bcrypt.hash('manager123', 12);
    const employeePassword = await bcrypt.hash('employee123', 12);
    
    // Create test users
    const testUsers = [
      {
        full_name: 'Admin User',
        email: 'admin@company.com',
        nik: 'ADM001',
        division: 'Human Resources',
        employment_type: 'Permanent',
        leave_balance: 12,
        status: 'Active',
        start_date: '2024-01-01',
        role: 'Admin',
        password_hash: adminPassword
      },
      {
        full_name: 'Manager User',
        email: 'manager@company.com',
        nik: 'MGR001',
        division: 'Engineering',
        employment_type: 'Permanent',
        leave_balance: 12,
        status: 'Active',
        start_date: '2024-01-01',
        role: 'Manager',
        password_hash: managerPassword
      },
      {
        full_name: 'Employee User',
        email: 'employee@company.com',
        nik: 'EMP001',
        division: 'Engineering',
        employment_type: 'Permanent',
        leave_balance: 12,
        status: 'Active',
        start_date: '2024-01-01',
        role: 'Employee',
        password_hash: employeePassword
      }
    ];
    
    for (const user of testUsers) {
      const { data, error } = await supabase
        .from('employees')
        .insert([user])
        .select();
        
      if (error) {
        console.error(`Error creating user ${user.email}:`, error);
      } else {
        console.log(`✅ Created user: ${user.email} (${user.role})`);
      }
    }
    
    // Update manager relationship
    const { data: managerData } = await supabase
      .from('employees')
      .select('id')
      .eq('email', 'manager@company.com')
      .single();
      
    if (managerData) {
      await supabase
        .from('employees')
        .update({ manager_id: managerData.id })
        .eq('email', 'employee@company.com');
      console.log('✅ Set manager relationship');
    }
    
    console.log('\n🎉 Test users created successfully!');
    console.log('\nLogin credentials:');
    console.log('HR Admin: admin@company.com / admin123');
    console.log('Manager: manager@company.com / manager123');
    console.log('Employee: employee@company.com / employee123');
    
  } catch (error) {
    console.error('Error creating test users:', error);
  }
}

createTestUsers();