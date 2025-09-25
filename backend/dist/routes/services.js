"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const serviceController_1 = require("../controllers/serviceController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticateToken);
// GET /api/services - Get all services
router.get('/', serviceController_1.getAllServices);
// GET /api/services/active - Get active services only
router.get('/active', serviceController_1.getActiveServices);
// GET /api/services/:id - Get service by ID
router.get('/:id', serviceController_1.getServiceById);
// POST /api/services - Create new service
router.post('/', serviceController_1.createService);
// PUT /api/services/:id - Update service
router.put('/:id', serviceController_1.updateService);
// PATCH /api/services/:id/toggle - Toggle service active status
router.patch('/:id/toggle', serviceController_1.toggleServiceStatus);
// DELETE /api/services/:id - Delete service
router.delete('/:id', serviceController_1.deleteService);
exports.default = router;
//# sourceMappingURL=services.js.map