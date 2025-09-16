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

async function fixPasswords() {
  try {
    console.log('🔧 Fixing user passwords...');
    
    // Define correct passwords and generate proper hashes
    const users = [
      { email: 'admin@company.com', password: 'admin123' },
      { email: 'manager@company.com', password: 'manager123' },
      { email: 'employee@company.com', password: 'employee123' }
    ];
    
    for (const user of users) {
      console.log(`\n🔐 Updating password for ${user.email}...`);
      
      // Generate correct hash
      const passwordHash = await bcrypt.hash(user.password, 12);
      
      // Update user in database
      const { data, error } = await supabase
        .from('employees')
        .update({ password_hash: passwordHash })
        .eq('email', user.email)
        .select();
      
      if (error) {
        console.error(`❌ Failed to update ${user.email}:`, error.message);
      } else {
        console.log(`✅ Updated ${user.email}`);
        
        // Verify the update worked
        const { data: verifyUser, error: verifyError } = await supabase
          .from('employees')
          .select('password_hash')
          .eq('email', user.email)
          .single();
        
        if (!verifyError && verifyUser) {
          const isValid = await bcrypt.compare(user.password, verifyUser.password_hash);
          console.log(`   Verification: ${isValid ? '✅ Success' : '❌ Failed'}`);
        }
      }
    }
    
    console.log('\n🎉 Password fix completed!');
    console.log('\n🔑 Test Login Credentials:');
    console.log('HR Admin: admin@company.com / admin123');
    console.log('Manager: manager@company.com / manager123');
    console.log('Employee: employee@company.com / employee123');
    console.log('\n💡 You can now test the login functionality!');
    
  } catch (error) {
    console.error('❌ Password fix failed:', error.message);
  }
}

fixPasswords();