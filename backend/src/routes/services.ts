import express from 'express';
import {
  getAllServices,
  getActiveServices,
  getServiceById,
  createService,
  updateService,
  toggleServiceStatus,
  deleteService
} from '../controllers/serviceController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/services - Get all services
router.get('/', getAllServices);

// GET /api/services/active - Get active services only
router.get('/active', getActiveServices);

// GET /api/services/:id - Get service by ID
router.get('/:id', getServiceById);

// POST /api/services - Create new service
router.post('/', createService);

// PUT /api/services/:id - Update service
router.put('/:id', updateService);

// PATCH /api/services/:id/toggle - Toggle service active status
router.patch('/:id/toggle', toggleServiceStatus);

// DELETE /api/services/:id - Delete service
router.delete('/:id', deleteService);

export default router;