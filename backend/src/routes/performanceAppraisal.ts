import express from 'express';
import {
  getSurveys,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  getSurveyDetails,
  assignSurvey,
  getUserAssignments,
  getSurveyAssignments,
  deleteAssignment,
  submitSurveyResponse,
  getSurveyResponses,
  saveResponses,
  getResponses
} from '../controllers/performanceAppraisalController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Get all surveys (Admin only)
router.get('/surveys', authenticateToken, requireRole(['Admin']), getSurveys);

// Create a new survey (Admin only)
router.post('/surveys', authenticateToken, requireRole(['Admin']), createSurvey);

// Update an existing survey (Admin only)
router.put('/surveys/:id', authenticateToken, requireRole(['Admin']), updateSurvey);

// Delete a survey (Admin only)
router.delete('/surveys/:id', authenticateToken, requireRole(['Admin']), deleteSurvey);

// Get survey details with pages and questions
router.get('/surveys/:id', authenticateToken, getSurveyDetails);

// Assign survey to employees (Admin only)
router.post('/surveys/assign', authenticateToken, requireRole(['Admin']), assignSurvey);
router.post('/assignments', authenticateToken, requireRole(['Admin']), assignSurvey);

// Get assignments for current user
router.get('/assignments', authenticateToken, getUserAssignments);
router.get('/user-assignments', authenticateToken, getUserAssignments);

// Get assignments for a specific survey (Admin only)
router.get('/surveys/:id/assignments', authenticateToken, requireRole(['Admin']), getSurveyAssignments);

// Delete an assignment (Admin only)
router.delete('/assignments/:id', authenticateToken, requireRole(['Admin']), deleteAssignment);

// Save survey responses (draft or submission)
router.post('/responses', authenticateToken, saveResponses);

// Get existing responses for an assignment
router.get('/responses/:assignmentId', authenticateToken, getResponses);

// Submit survey response (legacy)
router.post('/responses/submit', authenticateToken, submitSurveyResponse);

// Get survey responses for an assignment (admin)
router.get('/responses/admin/:assignmentId', authenticateToken, requireRole(['Admin']), getSurveyResponses);

export default router;