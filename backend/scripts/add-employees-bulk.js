const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const bcrypt = require('bcryptjs');

// Generate random password function
const generateRandomPassword = () => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one character from each type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Hash password function
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

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

// Employee data from the user
const employeesData = [
  { nik: 'PLG-B-001', name: 'Izki Aldrin Iswarna', department: 'Operations', hire_date: '2022-11-01' },
  { nik: 'PLG-B-002', name: 'KyungMin Bang', department: 'BoD', hire_date: null },
  { nik: 'PLG-001', name: 'Novri Ichsan Dwiyanri', department: 'Product', hire_date: '2022-10-17' },
  { nik: 'PLG-002', name: 'Fitri Kurnia Ishardani', department: 'Support', hire_date: '2022-10-17' },
  { nik: 'PLG-003', name: 'Prawira Adi Putra', department: 'Operations', hire_date: '2022-10-17' },
  { nik: 'PLG-004', name: 'Shafira Anjani Adardam', department: 'Commercial', hire_date: '2022-10-17' },
  { nik: 'PLG-005', name: 'Reyhan Nuha Aditrea', department: 'Product', hire_date: '2022-10-17' },
  { nik: 'PLG-006', name: 'Phrygian Cavalry', department: 'Commercial', hire_date: '2022-10-17' },
  { nik: 'PLG-007', name: 'Gadis Nabilah Salsabila', department: 'Operations', hire_date: '2022-10-17' },
  { nik: 'PLG-008', name: 'Tauffani Titisari', department: 'Operations', hire_date: '2022-10-17' },
  { nik: 'PLG-009', name: 'Yuanda Lestari', department: 'Commercial', hire_date: '2022-10-17' },
  { nik: 'PLG-010', name: 'Arwielano', department: 'Commercial', hire_date: '2022-11-01' },
  { nik: 'PLG-011', name: 'Bonaventura Briliandru B', department: 'Commercial', hire_date: '2022-11-01' },
  { nik: 'PLG-012', name: 'Cindy Pricilla Muharara', department: 'Commercial', hire_date: '2022-11-01' },
  { nik: 'PLG-013', name: 'Nuri Handayani', department: 'Commercial', hire_date: '2022-11-01' },
  { nik: 'PLG-014', name: 'Fajar Anugrah', department: 'Support', hire_date: '2022-11-08' },
  { nik: 'PLG-015', name: 'Dwinta Rachmawati', department: 'Product', hire_date: '2022-11-08' },
  { nik: 'PLG-016', name: 'Aditya Abdul Rahman Katamsi', department: 'Commercial', hire_date: '2022-12-12' },
  { nik: 'PLG-017', name: 'Fazri Alfan Muaz', department: 'Product', hire_date: '2023-02-06' },
  { nik: 'PLG-018', name: 'Benedictus Bagus Bhaskoro', department: 'Commercial', hire_date: '2023-02-21' },
  { nik: 'PLG-019', name: 'Femilia Yuniawati', department: 'Operations', hire_date: '2023-03-06' },
  { nik: 'PLG-020', name: 'Febtra Aditya Nasrul', department: 'Commercial', hire_date: '2023-03-21' },
  { nik: 'PLG-022', name: 'Andri Ayu Diaztari', department: 'Support', hire_date: '2023-05-02' },
  { nik: 'PLG-023', name: 'Hanny Liana Limbong', department: 'Product', hire_date: '2023-05-02' },
  { nik: 'PLG-024', name: 'Febrian Pratama Putra', department: 'Product', hire_date: '2023-05-08' },
  { nik: 'PLG-025', name: 'Vieni Rizky Febrian', department: 'Operations', hire_date: '2023-05-08' },
  { nik: 'PLG-026', name: 'Devi Sintya', department: 'Commercial', hire_date: '2023-05-15' },
  { nik: 'PLG0-001', name: 'Nandini Eka Syawali Tanjung', department: 'Commercial', hire_date: '2023-05-15' },
  { nik: 'PLG-027', name: 'Ade Anita', department: 'Commercial', hire_date: '2023-05-22' },
  { nik: 'PLG-028', name: 'Zalikal Yunaf', department: 'Commercial', hire_date: '2023-05-29' },
  { nik: 'PLG-029', name: 'Tari Vandira', department: 'Product', hire_date: '2023-07-03' },
  { nik: 'PLG-030', name: 'Femilia Yuniawati', department: 'Operations', hire_date: '2023-07-06' },
  { nik: 'PLG-031', name: 'Benedictus Bagus Bhaskoro', department: 'Commercial', hire_date: '2023-02-21' },
  { nik: 'PLG-032', name: 'Maulvy Aufar Mudzakir', department: 'Product', hire_date: '2023-09-01' },
  { nik: 'PLG-033', name: 'Solpa Puji Harsagi', department: 'Commercial', hire_date: '2023-09-11' },
  { nik: 'PLG-034', name: 'Daffa Ramadhan', department: 'Commercial', hire_date: '2023-09-18' },
  { nik: 'PLG-035', name: 'Ilma Dinnia Alghani', department: 'Product', hire_date: '2023-10-02' },
  { nik: 'PLG-036', name: 'Feber Widianto', department: 'Product', hire_date: '2023-10-02' },
  { nik: 'PLG-037', name: 'Revina Amanda Suriawan', department: 'Support', hire_date: '2023-10-09' },
  { nik: 'PLG-039', name: 'Mutia Isni Rahayu', department: 'Commercial', hire_date: '2023-11-27' },
  { nik: 'PLG-040', name: 'Furqanda Labarza', department: 'Commercial', hire_date: '2023-11-27' },
  { nik: 'PLG-041', name: 'Sugeng Atik Setiyono', department: 'Commercial', hire_date: '2024-02-05' },
  { nik: 'PLG-042', name: 'Revina Amanda Suriawan', department: 'Support', hire_date: '2024-02-08' },
  { nik: 'PLG-043', name: 'Devi Sintya', department: 'Commercial', hire_date: '2024-02-15' },
  { nik: 'PLG-044', name: 'Nur Faziah Wisnu', department: 'Commercial', hire_date: '2024-02-19' },
  { nik: 'PLG-045', name: 'Auliafrisca', department: 'Commercial', hire_date: '2024-02-19' },
  { nik: 'PLG-046', name: 'Lingga Permata Siwi', department: 'Commercial', hire_date: '2024-02-19' },
  { nik: 'PLG-047', name: 'Ade Anita', department: 'Commercial', hire_date: '2024-02-22' },
  { nik: 'PLG-048', name: 'Ligar Aji Pandika', department: 'Product', hire_date: '2024-03-25' },
  { nik: 'PLG-049', name: 'Feber Widianto', department: 'Commercial', hire_date: '2024-04-02' },
  { nik: 'PLG-050', name: 'Fajar Surya Dewantara', department: 'Commercial', hire_date: '2024-04-16' },
  { nik: 'PLG-051', name: 'Adielia Hanandiva', department: 'Commercial', hire_date: '2024-04-16' },
  { nik: 'PLG-052', name: 'Aninda Putri Indriasari', department: 'Product', hire_date: '2024-04-16' },
  { nik: 'PLG-053', name: 'Nawafi El Bikri', department: 'Operations', hire_date: '2024-04-16' },
  { nik: 'PLG-054', name: 'Prima Ulfa Mulia Arta', department: 'CEO Office', hire_date: '2024-05-05' },
  { nik: 'PLG-055', name: 'Alvernia Agustina', department: 'Commercial', hire_date: '2024-07-01' },
  { nik: 'PLG-056', name: 'Muhammad Rizkyanda', department: 'Commercial', hire_date: '2024-07-01' }
];

async function addEmployeesBulk() {
  try {
    console.log('🚀 Starting bulk employee insertion...');
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const employeeData of employeesData) {
      try {
        // Check if employee already exists
        const { data: existingEmployee } = await supabase
          .from('employees')
          .select('nik')
          .eq('nik', employeeData.nik)
          .single();
        
        if (existingEmployee) {
          console.log(`⚠️  Employee ${employeeData.nik} already exists, skipping...`);
          continue;
        }
        
        // Generate random password for each employee
        const plainPassword = generateRandomPassword();
        const password_hash = await hashPassword(plainPassword);
        
        // Create employee record
        const employeeRecord = {
          nik: employeeData.nik,
          full_name: employeeData.name,
          division: employeeData.department,
          start_date: employeeData.hire_date || '2022-01-01', // Use default date if null
          employment_type: 'Permanent',
          leave_balance: 12,
          role: 'Employee',
          status: 'Active',
          password_hash: password_hash,
          password_changed: false,
          email: `${employeeData.nik.toLowerCase()}@plugo.id` // Generate placeholder email
        };
        
        const { error } = await supabase
          .from('employees')
          .insert([employeeRecord]);
        
        if (error) {
          console.error(`❌ Error inserting ${employeeData.nik}:`, error.message);
          errors.push({ nik: employeeData.nik, error: error.message });
          errorCount++;
        } else {
          console.log(`✅ Successfully added ${employeeData.nik} - ${employeeData.name}`);
          successCount++;
        }
        
      } catch (err) {
        console.error(`❌ Error processing ${employeeData.nik}:`, err.message);
        errors.push({ nik: employeeData.nik, error: err.message });
        errorCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Successfully added: ${successCount} employees`);
    console.log(`❌ Errors: ${errorCount} employees`);
    
    if (errors.length > 0) {
      console.log('\n❌ Error details:');
      errors.forEach(err => {
        console.log(`  - ${err.nik}: ${err.error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

addEmployeesBulk();