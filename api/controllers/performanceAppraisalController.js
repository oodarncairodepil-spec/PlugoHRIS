"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSurveyResponses = exports.submitSurveyResponse = exports.deleteSurvey = exports.getResponses = exports.saveResponses = exports.deleteAssignment = exports.getSurveyAssignments = exports.getUserAssignments = exports.assignSurvey = exports.getSurveyDetails = exports.updateSurvey = exports.createSurvey = exports.getSurveys = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
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
        if (error)
            throw error;
        res.json({ surveys: data });
    }
    catch (error) {
        console.error('Error fetching surveys:', error);
        res.status(500).json({ error: 'Failed to fetch surveys' });
    }
};
exports.getSurveys = getSurveys;
// Create a new survey
const createSurvey = async (req, res) => {
    try {
        const { title, description, questions } = req.body;
        const createdBy = req.user?.id;
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
        if (surveyError)
            throw surveyError;
        // Create a default page for the survey
        const { data: pageData, error: pageError } = await supabase
            .from('survey_pages')
            .insert({
            survey_id: survey.id,
            page_number: 1,
            title: title,
            description: description
        })
            .select()
            .single();
        if (pageError)
            throw pageError;
        // Create questions
        if (questions && questions.length > 0) {
            const questionsToInsert = questions.map((question, qIndex) => {
                // Map frontend question types to database types
                let questionType = question.type;
                if (questionType === 'rating')
                    questionType = 'rating_scale';
                if (questionType === 'text')
                    questionType = 'free_text';
                return {
                    survey_id: survey.id,
                    page_id: pageData.id,
                    question_text: question.text || question.question_text,
                    question_type: questionType,
                    question_order: qIndex + 1,
                    is_required: question.required || false,
                    scale_min: question.scaleMin || null,
                    scale_max: question.scaleMax || null,
                    scale_left_label: question.scaleMinLabel || null,
                    scale_right_label: question.scaleMaxLabel || null,
                    options: question.options ? JSON.stringify(question.options) : null
                };
            });
            const { error: questionsError } = await supabase
                .from('survey_questions')
                .insert(questionsToInsert);
            if (questionsError)
                throw questionsError;
        }
        res.status(201).json({ survey, message: 'Survey created successfully' });
    }
    catch (error) {
        console.error('Error creating survey:', error);
        res.status(500).json({ error: 'Failed to create survey' });
    }
};
exports.createSurvey = createSurvey;
// Update an existing survey
const updateSurvey = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, questions } = req.body;
        // Update the survey
        const { data: survey, error: surveyError } = await supabase
            .from('performance_surveys')
            .update({
            title,
            description
        })
            .eq('id', id)
            .select()
            .single();
        if (surveyError)
            throw surveyError;
        // Get the page for this survey
        const { data: pageData, error: pageError } = await supabase
            .from('survey_pages')
            .select('id')
            .eq('survey_id', id)
            .single();
        if (pageError)
            throw pageError;
        // Delete existing questions
        const { error: deleteError } = await supabase
            .from('survey_questions')
            .delete()
            .eq('survey_id', id);
        if (deleteError)
            throw deleteError;
        // Create new questions
        if (questions && questions.length > 0) {
            const questionsToInsert = questions.map((question, qIndex) => {
                // Map frontend question types to database types
                let questionType = question.type;
                if (questionType === 'rating')
                    questionType = 'rating_scale';
                if (questionType === 'text')
                    questionType = 'free_text';
                return {
                    survey_id: id,
                    page_id: pageData.id,
                    question_text: question.text || question.question_text,
                    question_type: questionType,
                    question_order: qIndex + 1,
                    is_required: question.required || false,
                    scale_min: question.scaleMin || null,
                    scale_max: question.scaleMax || null,
                    scale_left_label: question.scaleMinLabel || null,
                    scale_right_label: question.scaleMaxLabel || null,
                    options: question.options ? JSON.stringify(question.options) : null
                };
            });
            const { error: questionsError } = await supabase
                .from('survey_questions')
                .insert(questionsToInsert);
            if (questionsError)
                throw questionsError;
        }
        res.json({ survey, message: 'Survey updated successfully' });
    }
    catch (error) {
        console.error('Error updating survey:', error);
        res.status(500).json({ error: 'Failed to update survey' });
    }
};
exports.updateSurvey = updateSurvey;
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
        if (surveyError)
            throw surveyError;
        // Get pages
        const { data: pages, error: pagesError } = await supabase
            .from('survey_pages')
            .select('*')
            .eq('survey_id', id)
            .order('page_number');
        if (pagesError)
            throw pagesError;
        // Get questions for each page
        const pagesWithQuestions = await Promise.all(pages.map(async (page) => {
            const { data: questions, error: questionsError } = await supabase
                .from('survey_questions')
                .select('*')
                .eq('page_id', page.id)
                .order('question_order');
            if (questionsError)
                throw questionsError;
            return {
                ...page,
                questions: questions.map((q) => ({
                    ...q,
                    options: q.options ? JSON.parse(q.options) : null
                }))
            };
        }));
        // Also get all questions in a flat array for editing
        const { data: allQuestions, error: allQuestionsError } = await supabase
            .from('survey_questions')
            .select('*')
            .eq('survey_id', id)
            .order('question_order');
        if (allQuestionsError)
            throw allQuestionsError;
        const formattedQuestions = allQuestions.map((q) => ({
            id: q.id,
            text: q.question_text,
            type: q.question_type,
            required: q.required,
            options: q.options ? JSON.parse(q.options) : [],
            scaleMin: q.scale_min,
            scaleMax: q.scale_max,
            scaleMinLabel: q.scale_min_label,
            scaleMaxLabel: q.scale_max_label
        }));
        res.json({
            survey: {
                ...survey,
                pages: pagesWithQuestions,
                questions: formattedQuestions
            }
        });
    }
    catch (error) {
        console.error('Error fetching survey details:', error);
        res.status(500).json({ error: 'Failed to fetch survey details' });
    }
};
exports.getSurveyDetails = getSurveyDetails;
// Assign survey to employees
const assignSurvey = async (req, res) => {
    try {
        console.log('=== ASSIGN SURVEY REQUEST ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('User:', req.user);
        const { survey_id, assignments } = req.body;
        // assignments: [{ assigneeId, reviewerId, dueDate }]
        console.log('Survey ID:', survey_id);
        console.log('Assignments:', assignments);
        const assignmentsToInsert = assignments.map((assignment) => ({
            survey_id,
            reviewee_id: assignment.assigneeId,
            reviewer_id: assignment.reviewerId,
            status: 'pending',
            assigned_at: new Date().toISOString()
        }));
        console.log('Assignments to insert:', JSON.stringify(assignmentsToInsert, null, 2));
        const { error } = await supabase
            .from('survey_assignments')
            .insert(assignmentsToInsert);
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        console.log('Survey assigned successfully');
        res.json({ message: 'Survey assigned successfully' });
    }
    catch (error) {
        console.error('Error assigning survey:', error);
        res.status(500).json({ error: 'Failed to assign survey' });
    }
};
exports.assignSurvey = assignSurvey;
// Get assignments for a user
const getUserAssignments = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { data, error } = await supabase
            .from('survey_assignments')
            .select(`
        *,
        survey:performance_surveys(*),
        reviewee:employees!survey_assignments_reviewee_id_fkey(id, full_name, email)
      `)
            .eq('reviewer_id', userId)
            .order('assigned_at', { ascending: false });
        if (error)
            throw error;
        res.json({ assignments: data });
    }
    catch (error) {
        console.error('Error fetching user assignments:', error);
        res.status(500).json({ error: 'Failed to fetch assignments' });
    }
};
exports.getUserAssignments = getUserAssignments;
// Get assignments for a specific survey (Admin only)
const getSurveyAssignments = async (req, res) => {
    try {
        const { id: surveyId } = req.params;
        const { data, error } = await supabase
            .from('survey_assignments')
            .select(`
        *,
        assignee:employees!survey_assignments_reviewee_id_fkey(id, full_name, email),
        reviewer:employees!survey_assignments_reviewer_id_fkey(id, full_name, email)
      `)
            .eq('survey_id', surveyId)
            .order('assigned_at', { ascending: false });
        if (error)
            throw error;
        // Format the response to match the frontend expectations
        const formattedAssignments = data.map((assignment) => ({
            id: assignment.id,
            survey_id: assignment.survey_id,
            assignee_id: assignment.reviewee_id,
            reviewer_id: assignment.reviewer_id,
            status: assignment.status,
            assigned_at: assignment.assigned_at,
            assignee_name: assignment.assignee?.full_name || 'Unknown',
            reviewer_name: assignment.reviewer?.full_name || 'Unknown',
            due_date: assignment.due_date
        }));
        res.json({ assignments: formattedAssignments });
    }
    catch (error) {
        console.error('Error fetching survey assignments:', error);
        res.status(500).json({ error: 'Failed to fetch survey assignments' });
    }
};
exports.getSurveyAssignments = getSurveyAssignments;
// Delete an assignment (Admin only)
const deleteAssignment = async (req, res) => {
    try {
        const { id: assignmentId } = req.params;
        // Check if assignment exists
        const { data: assignment, error: checkError } = await supabase
            .from('survey_assignments')
            .select('id')
            .eq('id', assignmentId)
            .single();
        if (checkError || !assignment) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        // Delete the assignment
        const { error: deleteError } = await supabase
            .from('survey_assignments')
            .delete()
            .eq('id', assignmentId);
        if (deleteError)
            throw deleteError;
        res.json({ message: 'Assignment deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({ error: 'Failed to delete assignment' });
    }
};
exports.deleteAssignment = deleteAssignment;
// Save survey responses (draft or submission)
const saveResponses = async (req, res) => {
    try {
        const { assignment_id, responses, is_submission } = req.body;
        // responses: [{ question_id, answer }]
        // Insert/update responses
        const responsesToSave = responses.map((response) => ({
            assignment_id,
            question_id: response.question_id,
            answer: response.answer,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));
        const { error: responsesError } = await supabase
            .from('survey_responses')
            .upsert(responsesToSave, { onConflict: 'assignment_id,question_id' });
        if (responsesError)
            throw responsesError;
        // Update assignment status
        const status = is_submission ? 'completed' : 'in_progress';
        const updateData = { status };
        if (is_submission) {
            updateData.completed_at = new Date().toISOString();
        }
        const { error: assignmentError } = await supabase
            .from('survey_assignments')
            .update(updateData)
            .eq('id', assignment_id);
        if (assignmentError)
            throw assignmentError;
        res.json({
            message: is_submission ? 'Survey submitted successfully' : 'Draft saved successfully'
        });
    }
    catch (error) {
        console.error('Error saving responses:', error);
        res.status(500).json({ error: 'Failed to save responses' });
    }
};
exports.saveResponses = saveResponses;
// Get existing responses for an assignment
const getResponses = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const { data, error } = await supabase
            .from('survey_responses')
            .select('*')
            .eq('assignment_id', assignmentId);
        if (error)
            throw error;
        res.json({ responses: data });
    }
    catch (error) {
        console.error('Error getting survey responses:', error);
        res.status(500).json({ error: 'Failed to get survey responses' });
    }
};
exports.getResponses = getResponses;
// Delete a survey
const deleteSurvey = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if survey exists
        const { data: survey, error: surveyError } = await supabase
            .from('performance_surveys')
            .select('id')
            .eq('id', id)
            .single();
        if (surveyError || !survey) {
            return res.status(404).json({ error: 'Survey not found' });
        }
        // Delete the survey (cascade will handle related records)
        const { error: deleteError } = await supabase
            .from('performance_surveys')
            .delete()
            .eq('id', id);
        if (deleteError)
            throw deleteError;
        res.json({ message: 'Survey deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting survey:', error);
        res.status(500).json({ error: 'Failed to delete survey' });
    }
};
exports.deleteSurvey = deleteSurvey;
// Submit survey response (legacy - keeping for compatibility)
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
        if (assignmentError)
            throw assignmentError;
        // Insert responses
        const responsesToInsert = responses.map((response) => ({
            assignment_id: assignmentId,
            question_id: response.questionId,
            response_text: response.responseText,
            response_number: response.responseNumber,
            response_options: response.responseOptions ? JSON.stringify(response.responseOptions) : null
        }));
        const { error: responsesError } = await supabase
            .from('survey_responses')
            .upsert(responsesToInsert, { onConflict: 'assignment_id,question_id' });
        if (responsesError)
            throw responsesError;
        res.json({ message: 'Survey response submitted successfully' });
    }
    catch (error) {
        console.error('Error submitting survey response:', error);
        res.status(500).json({ error: 'Failed to submit survey response' });
    }
};
exports.submitSurveyResponse = submitSurveyResponse;
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
        if (error)
            throw error;
        const formattedResponses = data.map((response) => ({
            ...response,
            response_options: response.response_options ? JSON.parse(response.response_options) : null
        }));
        res.json({ responses: formattedResponses });
    }
    catch (error) {
        console.error('Error fetching survey responses:', error);
        res.status(500).json({ error: 'Failed to fetch survey responses' });
    }
};
exports.getSurveyResponses = getSurveyResponses;
//# sourceMappingURL=performanceAppraisalController.js.map