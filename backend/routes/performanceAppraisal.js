const express = require('express');
const router = express.Router();
const {
  getSurveys,
  createSurvey,
  getSurveyDetails,
  assignSurvey,
  getUserAssignments,
  submitSurveyResponse,
  getSurveyResponses
} = require('../controllers/performanceAppraisalController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all surveys (Admin only)
router.get('/surveys', authenticateToken, requireRole(['Admin']), getSurveys);

// Create a new survey (Admin only)
router.post('/surveys', authenticateToken, requireRole(['Admin']), createSurvey);

// Get survey details with pages and questions
router.get('/surveys/:id', authenticateToken, getSurveyDetails);

// Assign survey to employees (Admin only)
router.post('/surveys/assign', authenticateToken, requireRole(['Admin']), assignSurvey);

// Get assignments for current user
router.get('/assignments', authenticateToken, getUserAssignments);

// Submit survey response
router.post('/responses', authenticateToken, submitSurveyResponse);

// Get survey responses for an assignment
router.get('/responses/:assignmentId', authenticateToken, getSurveyResponses);

module.exports = router;