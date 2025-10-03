const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get all surveys
const getSurveys = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('performance_surveys')
      .select(`
        *,
        created_by_employee:employees!performance_surveys_created_by_fkey(full_name)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ surveys: data });
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ error: 'Failed to fetch surveys' });
  }
};

// Create a new survey
const createSurvey = async (req, res) => {
  try {
    const { title, description, pages } = req.body;
    const createdBy = req.user.id;

    // Create the survey
    const { data: survey, error: surveyError } = await supabase
      .from('performance_surveys')
      .insert({
        title,
        description,
        created_by: createdBy
      })
      .select()
      .single();

    if (surveyError) throw surveyError;

    // Create pages and questions
    if (pages && pages.length > 0) {
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        
        // Create page
        const { data: pageData, error: pageError } = await supabase
          .from('survey_pages')
          .insert({
            survey_id: survey.id,
            page_number: i + 1,
            title: page.title,
            description: page.description
          })
          .select()
          .single();

        if (pageError) throw pageError;

        // Create questions for this page
        if (page.questions && page.questions.length > 0) {
          const questionsToInsert = page.questions.map((question, qIndex) => ({
            survey_id: survey.id,
            page_id: pageData.id,
            question_text: question.text,
            question_type: question.type,
            question_order: qIndex + 1,
            is_required: question.required || false,
            scale_min: question.scaleMin,
            scale_max: question.scaleMax,
            scale_left_label: question.scaleLeftLabel,
            scale_right_label: question.scaleRightLabel,
            options: question.options ? JSON.stringify(question.options) : null,
            allow_multiple_selection: question.allowMultiple || false
          }));

          const { error: questionsError } = await supabase
            .from('survey_questions')
            .insert(questionsToInsert);

          if (questionsError) throw questionsError;
        }
      }
    }

    res.status(201).json({ survey, message: 'Survey created successfully' });
  } catch (error) {
    console.error('Error creating survey:', error);
    res.status(500).json({ error: 'Failed to create survey' });
  }
};

// Get survey details with pages and questions
const getSurveyDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Get survey
    const { data: survey, error: surveyError } = await supabase
      .from('performance_surveys')
      .select('*')
      .eq('id', id)
      .single();

    if (surveyError) throw surveyError;

    // Get pages
    const { data: pages, error: pagesError } = await supabase
      .from('survey_pages')
      .select('*')
      .eq('survey_id', id)
      .order('page_number');

    if (pagesError) throw pagesError;

    // Get questions for each page
    const pagesWithQuestions = await Promise.all(
      pages.map(async (page) => {
        const { data: questions, error: questionsError } = await supabase
          .from('survey_questions')
          .select('*')
          .eq('page_id', page.id)
          .order('question_order');

        if (questionsError) throw questionsError;

        return {
          ...page,
          questions: questions.map(q => ({
            ...q,
            options: q.options ? JSON.parse(q.options) : null
          }))
        };
      })
    );

    res.json({
      survey: {
        ...survey,
        pages: pagesWithQuestions
      }
    });
  } catch (error) {
    console.error('Error fetching survey details:', error);
    res.status(500).json({ error: 'Failed to fetch survey details' });
  }
};

// Assign survey to employees
const assignSurvey = async (req, res) => {
  try {
    const { surveyId, assignments } = req.body;
    // assignments: [{ reviewerId, revieweeIds: [] }]

    const assignmentsToInsert = [];
    
    assignments.forEach(assignment => {
      assignment.revieweeIds.forEach(revieweeId => {
        assignmentsToInsert.push({
          survey_id: surveyId,
          reviewer_id: assignment.reviewerId,
          reviewee_id: revieweeId
        });
      });
    });

    const { error } = await supabase
      .from('survey_assignments')
      .insert(assignmentsToInsert);

    if (error) throw error;

    res.json({ message: 'Survey assigned successfully' });
  } catch (error) {
    console.error('Error assigning survey:', error);
    res.status(500).json({ error: 'Failed to assign survey' });
  }
};

// Get assignments for a user
const getUserAssignments = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('survey_assignments')
      .select(`
        *,
        survey:performance_surveys(*),
        reviewee:employees!survey_assignments_reviewee_id_fkey(id, full_name, email)
      `)
      .eq('reviewer_id', userId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;

    res.json({ assignments: data });
  } catch (error) {
    console.error('Error fetching user assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
};

// Submit survey response
const submitSurveyResponse = async (req, res) => {
  try {
    const { assignmentId, responses } = req.body;
    // responses: [{ questionId, responseText, responseNumber, responseOptions }]

    // Update assignment status
    const { error: assignmentError } = await supabase
      .from('survey_assignments')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', assignmentId);

    if (assignmentError) throw assignmentError;

    // Insert responses
    const responsesToInsert = responses.map(response => ({
      assignment_id: assignmentId,
      question_id: response.questionId,
      response_text: response.responseText,
      response_number: response.responseNumber,
      response_options: response.responseOptions ? JSON.stringify(response.responseOptions) : null
    }));

    const { error: responsesError } = await supabase
      .from('survey_responses')
      .upsert(responsesToInsert, { onConflict: 'assignment_id,question_id' });

    if (responsesError) throw responsesError;

    res.json({ message: 'Survey response submitted successfully' });
  } catch (error) {
    console.error('Error submitting survey response:', error);
    res.status(500).json({ error: 'Failed to submit survey response' });
  }
};

// Get survey responses for an assignment
const getSurveyResponses = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const { data, error } = await supabase
      .from('survey_responses')
      .select(`
        *,
        question:survey_questions(*)
      `)
      .eq('assignment_id', assignmentId);

    if (error) throw error;

    const formattedResponses = data.map(response => ({
      ...response,
      response_options: response.response_options ? JSON.parse(response.response_options) : null
    }));

    res.json({ responses: formattedResponses });
  } catch (error) {
    console.error('Error fetching survey responses:', error);
    res.status(500).json({ error: 'Failed to fetch survey responses' });
  }
};

module.exports = {
  getSurveys,
  createSurvey,
  getSurveyDetails,
  assignSurvey,
  getUserAssignments,
  submitSurveyResponse,
  getSurveyResponses
};