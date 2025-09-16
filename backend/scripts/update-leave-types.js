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

async function updateLeaveTypes() {
  try {
    console.log('🚀 Updating leave types...');
    
    // Get existing leave types
    console.log('📋 Getting existing leave types...');
    const { data: existingTypes, error: fetchError } = await supabase
      .from('leave_types')
      .select('*');
    
    if (fetchError) {
      console.error('❌ Error fetching leave types:', fetchError);
      return;
    }
    
    console.log(`📊 Found ${existingTypes.length} existing leave types`);
    
    // Update existing leave types with clean names
    console.log('📝 Updating leave type names...');
    const leaveTypes = [
      { name: 'Annual Leave', description: 'Regular annual leave for employees', max_days_per_year: 21, requires_approval: true },
      { name: 'Annual Leave - First Half Day', description: 'First half day annual leave', max_days_per_year: null, requires_approval: true },
      { name: 'Annual Leave - Second Half Day', description: 'Second half day annual leave', max_days_per_year: null, requires_approval: true },
      { name: 'Time Off in Lieu', description: 'Time off in lieu of overtime worked', max_days_per_year: null, requires_approval: true },
      { name: 'Time Off in Lieu - First Half Day', description: 'First half day time off in lieu', max_days_per_year: null, requires_approval: true },
      { name: 'Time Off in Lieu - Second Half Day', description: 'Second half day time off in lieu', max_days_per_year: null, requires_approval: true },
      { name: 'Sick Leave', description: 'Medical leave for illness', max_days_per_year: 12, requires_approval: true },
      { name: 'Marital Leave', description: 'Leave for employee marriage', max_days_per_year: 3, requires_approval: true },
      { name: 'Menstruation leave', description: 'Monthly menstruation leave', max_days_per_year: 2, requires_approval: true },
      { name: 'Maternity Leave', description: 'Maternity leave for childbirth', max_days_per_year: 90, requires_approval: true },
      { name: 'Miscarriage Leave', description: 'Leave for miscarriage recovery', max_days_per_year: 45, requires_approval: true },
      { name: 'Bereavement Leave for Death of wife/ husband/ child/ parents/ parents in-laws', description: 'Bereavement leave for immediate family', max_days_per_year: 2, requires_approval: true },
      { name: 'Bereavement Leave for household member', description: 'Bereavement leave for household member', max_days_per_year: 1, requires_approval: true },
      { name: 'Child\'s circumcision/ baptism', description: 'Leave for child religious ceremonies', max_days_per_year: 2, requires_approval: true },
      { name: 'The Marriage of Employee\'s children', description: 'Leave for child marriage ceremony', max_days_per_year: 1, requires_approval: true },
      { name: 'The Miscarriage or the Labor of Employee\'s Child', description: 'Leave for child birth or miscarriage support', max_days_per_year: 2, requires_approval: true }
    ];
    
    // Create a mapping of old names to new names
    const nameMapping = {
      'Marital Leave (3 days)': 'Marital Leave',
      'Menstruation leave (2 days)': 'Menstruation leave',
      'Maternity Leave (3 months)': 'Maternity Leave',
      'Miscarriage Leave (1.5 month)': 'Miscarriage Leave',
      'Bereavement Leave for Death of wife/ husband/ child/ parents/ parents in-laws (2 Days)': 'Bereavement Leave for Death of wife/ husband/ child/ parents/ parents in-laws',
      'Bereavement Leave for household member (1 Days)': 'Bereavement Leave for household member',
      'Child\'s circumcision/ baptism (2 Days)': 'Child\'s circumcision/ baptism',
      'The Marriage of Employee\'s children (1 Day)': 'The Marriage of Employee\'s children',
      'The Miscarriage or the Labor of Employee\'s Child (2 Days)': 'The Miscarriage or the Labor of Employee\'s Child'
    };
    
    let updatedCount = 0;
    
    // Update each leave type that needs name cleaning
    for (const existingType of existingTypes) {
      const newName = nameMapping[existingType.name];
      if (newName) {
        const { error: updateError } = await supabase
          .from('leave_types')
          .update({ name: newName })
          .eq('id', existingType.id);
        
        if (updateError) {
          console.error(`❌ Error updating ${existingType.name}:`, updateError);
        } else {
          console.log(`✅ Updated: "${existingType.name}" → "${newName}"`);
          updatedCount++;
        }
      }
    }
    
    console.log(`\n✅ Leave types updated successfully! Updated ${updatedCount} leave type names.`);
    
  } catch (error) {
    console.error('❌ Error updating leave types:', error);
  }
}

updateLeaveTypes();