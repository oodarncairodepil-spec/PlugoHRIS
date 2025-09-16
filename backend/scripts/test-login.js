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

async function testLogin() {
  try {
    console.log('🧪 Testing login functionality...');
    
    const testCredentials = [
      { email: 'admin@company.com', password: 'admin123' },
      { email: 'manager@company.com', password: 'manager123' },
      { email: 'employee@company.com', password: 'employee123' }
    ];
    
    for (const creds of testCredentials) {
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
        console.log(`   🎉 Login would succeed for ${creds.email}`);
      } else {
        console.log(`   ❌ Login would fail for ${creds.email}`);
        // Debug password hash
        console.log(`   Current hash: ${employee.password_hash}`);
        const testHash = await bcrypt.hash(creds.password, 12);
        console.log(`   Test hash: ${testHash}`);
      }
    }
    
    console.log('\n📊 Test Summary:');
    console.log('If all tests show "Login would succeed", the backend is working correctly.');
    console.log('If you\'re still getting 401 errors, try:');
    console.log('1. Clear browser cache/localStorage');
    console.log('2. Check network tab for request details');
    console.log('3. Verify you\'re using the exact credentials above');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLogin();