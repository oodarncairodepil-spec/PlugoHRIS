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

async function createPerformanceAppraisalTables() {
  try {
    console.log('🚀 Creating Performance Appraisal tables...');
    
    // Create performance_surveys table
    console.log('📋 Creating performance_surveys table...');
    const { error: surveysError } = await supabase
      .from('performance_surveys')
      .select('id')
      .limit(1);
    
    if (surveysError && surveysError.code === 'PGRST116') {
      // Table doesn't exist, we need to create it via SQL
      console.log('⚠️  Tables need to be created manually in Supabase dashboard');
      console.log('📄 Please execute the following SQL in your Supabase SQL editor:');
      console.log(`
-- Performance Appraisal System Tables

-- Table for storing survey templates
CREATE TABLE IF NOT EXISTS performance_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing survey pages (for multi-page surveys)
CREATE TABLE IF NOT EXISTS survey_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID REFERENCES performance_surveys(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    title VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing survey questions
CREATE TABLE IF NOT EXISTS survey_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID REFERENCES performance_surveys(id) ON DELETE CASCADE,
    page_id UUID REFERENCES survey_pages(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('free_text', 'rating_scale', 'multiple_choice')),
    question_order INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT false,
    -- For rating scale questions
    scale_min INTEGER,
    scale_max INTEGER,
    scale_left_label VARCHAR(255),
    scale_right_label VARCHAR(255),
    -- For multiple choice questions
    options JSONB,
    allow_multiple_selection BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for survey assignments (who reviews whom)
CREATE TABLE IF NOT EXISTS survey_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID REFERENCES performance_surveys(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    reviewee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(survey_id, reviewer_id, reviewee_id)
);

-- Table for storing survey responses
CREATE TABLE IF NOT EXISTS survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES survey_assignments(id) ON DELETE CASCADE,
    question_id UUID REFERENCES survey_questions(id) ON DELETE CASCADE,
    response_text TEXT,
    response_number INTEGER,
    response_options JSONB, -- For multiple choice responses
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, question_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_survey_pages_survey_id ON survey_pages(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_survey_id ON survey_questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_page_id ON survey_questions(page_id);
CREATE INDEX IF NOT EXISTS idx_survey_assignments_survey_id ON survey_assignments(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_assignments_reviewer_id ON survey_assignments(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_survey_assignments_reviewee_id ON survey_assignments(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_assignment_id ON survey_responses(assignment_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_question_id ON survey_responses(question_id);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_performance_surveys_updated_at BEFORE UPDATE ON performance_surveys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_survey_responses_updated_at BEFORE UPDATE ON survey_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`);
      
      return;
    }
    
    console.log('✅ Performance appraisal tables already exist or were created successfully!');
    
    // Try to insert sample data
    console.log('📊 Inserting sample data...');
    
    // Get an admin user
    const { data: adminUser } = await supabase
      .from('employees')
      .select('id')
      .eq('role', 'Admin')
      .limit(1)
      .single();
    
    if (adminUser) {
      const { error: insertError } = await supabase
        .from('performance_surveys')
        .insert({
          title: 'Annual Performance Review 2024',
          description: 'Comprehensive annual performance evaluation survey',
          created_by: adminUser.id
        })
        .select()
        .single();
      
      if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
        console.log('⚠️  Sample data insertion failed:', insertError.message);
      } else {
        console.log('✅ Sample data inserted successfully!');
      }
    }
    
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

createPerformanceAppraisalTables();