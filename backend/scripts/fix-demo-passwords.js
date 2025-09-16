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

async function fixDemoPasswords() {
  try {
    console.log('🔧 Fixing demo passwords to match website credentials...');
    
    // The website shows password123 for all users
    const demoPassword = 'password123';
    const passwordHash = await bcrypt.hash(demoPassword, 12);
    
    console.log(`Generated hash for '${demoPassword}': ${passwordHash}`);
    
    // Update existing users
    const existingUsers = [
      { email: 'admin@company.com', role: 'Admin' },
      { email: 'manager@company.com', role: 'Manager' },
      { email: 'employee@company.com', role: 'Employee' }
    ];
    
    for (const user of existingUsers) {
      console.log(`\n🔐 Updating password for ${user.email}...`);
      
      const { data, error } = await supabase
        .from('employees')
        .update({ password_hash: passwordHash })
        .eq('email', user.email)
        .select();
      
      if (error) {
        console.error(`❌ Failed to update ${user.email}:`, error.message);
      } else {
        console.log(`✅ Updated ${user.email}`);
        
        // Verify the update
        const { data: verifyUser, error: verifyError } = await supabase
          .from('employees')
          .select('password_hash')
          .eq('email', user.email)
          .single();
        
        if (!verifyError && verifyUser) {
          const isValid = await bcrypt.compare(demoPassword, verifyUser.password_hash);
          console.log(`   Verification: ${isValid ? '✅ Success' : '❌ Failed'}`);
        }
      }
    }
    
    // Check if hr@company.com exists, if not create it
    console.log('\n👤 Checking for hr@company.com...');
    const { data: hrUser, error: hrError } = await supabase
      .from('employees')
      .select('email')
      .eq('email', 'hr@company.com')
      .single();
    
    if (hrError && hrError.code === 'PGRST116') {
      // User doesn't exist, create it
      console.log('Creating hr@company.com user...');
      
      const { data: newHrUser, error: createError } = await supabase
        .from('employees')
        .insert([{
          full_name: 'HR User',
          email: 'hr@company.com',
          nik: 'HR001',
          division: 'Human Resources',
          employment_type: 'Permanent',
          leave_balance: 12,
          status: 'Active',
          start_date: '2024-01-01',
          role: 'Admin',
          password_hash: passwordHash
        }])
        .select();
      
      if (createError) {
        console.error('❌ Failed to create hr@company.com:', createError.message);
      } else {
        console.log('✅ Created hr@company.com');
      }
    } else if (!hrError) {
      console.log('✅ hr@company.com already exists, updating password...');
      
      const { error: updateError } = await supabase
        .from('employees')
        .update({ password_hash: passwordHash })
        .eq('email', 'hr@company.com');
      
      if (updateError) {
        console.error('❌ Failed to update hr@company.com:', updateError.message);
      } else {
        console.log('✅ Updated hr@company.com password');
      }
    }
    
    console.log('\n🎉 Demo password fix completed!');
    console.log('\n🔑 Updated Demo Credentials (matching website):');
    console.log('HR: hr@company.com / password123');
    console.log('HR Admin: admin@company.com / password123');
    console.log('Manager: manager@company.com / password123');
    console.log('Employee: employee@company.com / password123');
    console.log('\n💡 All users now use password123 as shown on the website!');
    
  } catch (error) {
    console.error('❌ Demo password fix failed:', error.message);
  }
}

fixDemoPasswords();