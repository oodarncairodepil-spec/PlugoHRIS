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

async function testDemoLogin() {
  try {
    console.log('🧪 Testing demo login credentials...');
    
    const demoCredentials = [
      { email: 'hr@company.com', password: 'password123' },
      { email: 'admin@company.com', password: 'password123' },
      { email: 'manager@company.com', password: 'password123' },
      { email: 'employee@company.com', password: 'password123' }
    ];
    
    for (const creds of demoCredentials) {
      console.log(`\n🔐 Testing login for ${creds.email}...`);
      
      // Simulate the exact login process from the controller
      const { data: employee, error } = await supabase
        .from('employees')
        .select('id, email, password_hash, role, full_name, status')
        .eq('email', creds.email.toLowerCase())
        .single();
      
      if (error || !employee) {
        console.log(`❌ User not found: ${error?.message || 'No employee data'}`);
        continue;
      }
      
      console.log(`✅ User found: ${employee.full_name} (${employee.role})`);
      console.log(`   Status: ${employee.status}`);
      
      if (employee.status !== 'Active') {
        console.log(`❌ Account is inactive`);
        continue;
      }
      
      // Test password verification
      const isValidPassword = await bcrypt.compare(creds.password, employee.password_hash);
      console.log(`   Password verification: ${isValidPassword ? '✅ Success' : '❌ Failed'}`);
      
      if (isValidPassword) {
        console.log(`   🎉 Login SUCCESS for ${creds.email}`);
      } else {
        console.log(`   ❌ Login FAILED for ${creds.email}`);
      }
    }
    
    console.log('\n🎯 Final Test Summary:');
    console.log('✅ All demo credentials should now work with password123');
    console.log('🌐 Try logging in at http://localhost:5173/');
    console.log('\n📋 Demo Credentials:');
    console.log('HR: hr@company.com / password123');
    console.log('HR Admin: admin@company.com / password123');
    console.log('Manager: manager@company.com / password123');
    console.log('Employee: employee@company.com / password123');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDemoLogin();