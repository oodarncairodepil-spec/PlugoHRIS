"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const performanceAppraisalController_1 = require("../controllers/performanceAppraisalController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get all surveys (Admin only)
router.get('/surveys', auth_1.authenticateToken, (0, auth_1.requireRole)(['Admin']), performanceAppraisalController_1.getSurveys);
// Create a new survey (Admin only)
router.post('/surveys', auth_1.authenticateToken, (0, auth_1.requireRole)(['Admin']), performanceAppraisalController_1.createSurvey);
// Update an existing survey (Admin only)
router.put('/surveys/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['Admin']), performanceAppraisalController_1.updateSurvey);
// Delete a survey (Admin only)
router.delete('/surveys/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['Admin']), performanceAppraisalController_1.deleteSurvey);
// Get survey details with pages and questions
router.get('/surveys/:id', auth_1.authenticateToken, performanceAppraisalController_1.getSurveyDetails);
// Assign survey to employees (Admin only)
router.post('/surveys/assign', auth_1.authenticateToken, (0, auth_1.requireRole)(['Admin']), performanceAppraisalController_1.assignSurvey);
router.post('/assignments', auth_1.authenticateToken, (0, auth_1.requireRole)(['Admin']), performanceAppraisalController_1.assignSurvey);
// Get assignments for current user
router.get('/assignments', auth_1.authenticateToken, performanceAppraisalController_1.getUserAssignments);
router.get('/user-assignments', auth_1.authenticateToken, performanceAppraisalController_1.getUserAssignments);
// Get assignments for a specific survey (Admin only)
router.get('/surveys/:id/assignments', auth_1.authenticateToken, (0, auth_1.requireRole)(['Admin']), performanceAppraisalController_1.getSurveyAssignments);
// Delete an assignment (Admin only)
router.delete('/assignments/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['Admin']), performanceAppraisalController_1.deleteAssignment);
// Save survey responses (draft or submission)
router.post('/responses', auth_1.authenticateToken, performanceAppraisalController_1.saveResponses);
// Get existing responses for an assignment
router.get('/responses/:assignmentId', auth_1.authenticateToken, performanceAppraisalController_1.getResponses);
// Submit survey response (legacy)
router.post('/responses/submit', auth_1.authenticateToken, performanceAppraisalController_1.submitSurveyResponse);
// Get survey responses for an assignment (admin)
router.get('/responses/admin/:assignmentId', auth_1.authenticateToken, (0, auth_1.requireRole)(['Admin']), performanceAppraisalController_1.getSurveyResponses);
exports.default = router;
//# sourceMappingURL=performanceAppraisal.js.map