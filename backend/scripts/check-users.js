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

async function checkUsers() {
  try {
    console.log('🔍 Checking database users...');
    
    // Check if users exist
    const { data: users, error } = await supabase
      .from('employees')
      .select('id, email, full_name, role, password_hash')
      .order('email');
    
    if (error) {
      console.error('❌ Error fetching users:', error.message);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ No users found in database!');
      console.log('💡 Please run the setup.sql script in Supabase first.');
      return;
    }
    
    console.log(`✅ Found ${users.length} users in database:`);
    
    for (const user of users) {
      console.log(`\n👤 ${user.full_name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Password hash: ${user.password_hash ? 'Present' : 'Missing'}`);
      
      // Test password verification for known test passwords
      const testPasswords = {
        'admin@company.com': 'admin123',
        'manager@company.com': 'manager123',
        'employee@company.com': 'employee123'
      };
      
      if (testPasswords[user.email]) {
        try {
          const isValid = await bcrypt.compare(testPasswords[user.email], user.password_hash);
          console.log(`   Password test: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
          
          if (!isValid) {
            console.log(`   Expected password: ${testPasswords[user.email]}`);
            // Generate correct hash for comparison
            const correctHash = await bcrypt.hash(testPasswords[user.email], 12);
            console.log(`   Correct hash would be: ${correctHash}`);
          }
        } catch (err) {
          console.log(`   Password test: ❌ Error - ${err.message}`);
        }
      }
    }
    
    // Test a direct login attempt
    console.log('\n🧪 Testing direct login with admin@company.com...');
    const { data: testUser, error: loginError } = await supabase
      .from('employees')
      .select('id, email, password_hash, role, full_name, status')
      .eq('email', 'admin@company.com')
      .single();
    
    if (loginError) {
      console.log('❌ Login test failed:', loginError.message);
    } else if (testUser) {
      console.log('✅ User found for login test');
      const passwordMatch = await bcrypt.compare('admin123', testUser.password_hash);
      console.log(`Password verification: ${passwordMatch ? '✅ Success' : '❌ Failed'}`);
      console.log(`User status: ${testUser.status}`);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkUsers();