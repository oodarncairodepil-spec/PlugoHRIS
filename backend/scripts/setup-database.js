const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
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

async function setupDatabase() {
  try {
    console.log('🚀 Setting up database...');
    
    // First, let's try to create tables using raw SQL
    console.log('📋 Creating tables...');
    
    // Create employees table
    const { error: employeesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS employees (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          full_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          nik VARCHAR(50) UNIQUE NOT NULL,
          division VARCHAR(100) NOT NULL,
          employment_type VARCHAR(20) CHECK (employment_type IN ('Permanent', 'Contract')) NOT NULL,
          leave_balance INTEGER DEFAULT 0,
          status VARCHAR(20) CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active',
          start_date DATE NOT NULL,
          role VARCHAR(20) CHECK (role IN ('Employee', 'Manager', 'Admin')) DEFAULT 'Employee',
          manager_id UUID REFERENCES employees(id),
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (employeesError) {
      console.log('⚠️  Table creation via RPC failed, trying direct insert...');
    } else {
      console.log('✅ Employees table created');
    }
    
    // Create leave_types table
    const { error: leaveTypesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS leave_types (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          max_days_per_year INTEGER,
          requires_approval BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (!leaveTypesError) {
      console.log('✅ Leave types table created');
    }
    
    // Now try to create test users
    console.log('👥 Creating test users...');
    
    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 12);
    const managerPassword = await bcrypt.hash('manager123', 12);
    const employeePassword = await bcrypt.hash('employee123', 12);
    
    // Create test users with raw SQL to bypass RLS
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
    
    // Try inserting users one by one
    for (const user of testUsers) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .insert([user])
          .select();
          
        if (error) {
          console.error(`❌ Error creating user ${user.email}:`, error.message);
          
          // Try with raw SQL if regular insert fails
          const { error: sqlError } = await supabase.rpc('exec_sql', {
            sql: `
              INSERT INTO employees (full_name, email, nik, division, employment_type, leave_balance, status, start_date, role, password_hash)
              VALUES ('${user.full_name}', '${user.email}', '${user.nik}', '${user.division}', '${user.employment_type}', ${user.leave_balance}, '${user.status}', '${user.start_date}', '${user.role}', '${user.password_hash}')
              ON CONFLICT (email) DO NOTHING;
            `
          });
          
          if (sqlError) {
            console.error(`❌ SQL insert also failed for ${user.email}:`, sqlError.message);
          } else {
            console.log(`✅ Created user via SQL: ${user.email} (${user.role})`);
          }
        } else {
          console.log(`✅ Created user: ${user.email} (${user.role})`);
        }
      } catch (err) {
        console.error(`❌ Exception creating user ${user.email}:`, err.message);
      }
    }
    
    // Create default leave types
    console.log('📝 Creating leave types...');
    const leaveTypes = [
      { name: 'Annual Leave', description: 'Yearly vacation leave', max_days_per_year: 12, requires_approval: true },
      { name: 'Sick Leave', description: 'Medical leave for illness', max_days_per_year: 30, requires_approval: false },
      { name: 'Emergency Leave', description: 'Urgent personal matters', max_days_per_year: 5, requires_approval: true },
      { name: 'Maternity Leave', description: 'Maternity leave for mothers', max_days_per_year: 90, requires_approval: true },
      { name: 'Paternity Leave', description: 'Paternity leave for fathers', max_days_per_year: 14, requires_approval: true }
    ];
    
    for (const leaveType of leaveTypes) {
      const { error } = await supabase
        .from('leave_types')
        .insert([leaveType])
        .select();
        
      if (error && !error.message.includes('duplicate')) {
        console.error(`❌ Error creating leave type ${leaveType.name}:`, error.message);
      } else {
        console.log(`✅ Created leave type: ${leaveType.name}`);
      }
    }
    
    console.log('\n🎉 Database setup completed!');
    console.log('\n🔑 Test Login Credentials:');
    console.log('HR Admin: admin@company.com / admin123');
    console.log('Manager: manager@company.com / manager123');
    console.log('Employee: employee@company.com / employee123');
    console.log('\n💡 You can now test the login functionality!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    console.log('\n📋 Manual Setup Required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the contents of database/schema.sql');
    console.log('4. Then run this script again');
  }
}

setupDatabase();