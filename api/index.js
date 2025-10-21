"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
// Ensure PORT is a number for app.listen
const PORT = Number(process.env.PORT) || 5000;
// Middleware
app.use((0, helmet_1.default)());
// Add both 5173 (dev) and 4173 (preview) to allowed origins during development
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://plugo-hris.vercel.app']
    : ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173', 'http://127.0.0.1:5174'];

// Permissive CORS for local dev to ensure Access-Control-Allow-Origin header is present
const corsOptions = {
    origin: '*',
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use((0, cors_1.default)(corsOptions));
// Manual CORS header fallback to ensure Access-Control-Allow-Origin is present
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'content-type,authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

// Enable preflight for all routes
app.options('*', (0, cors_1.default)(corsOptions));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Disable caching for API routes to prevent 304 responses
app.use('/api', (req, res, next) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    next();
});
// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Leave Request API is running' });
});
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const employees_1 = __importDefault(require("./routes/employees"));
const leaves_1 = __importDefault(require("./routes/leaves"));
const departments_1 = __importDefault(require("./routes/departments"));
const leaveBalance_1 = __importDefault(require("./routes/leaveBalance"));
const grabCodeRoutes_1 = __importDefault(require("./routes/grabCodeRoutes"));
const services_1 = __importDefault(require("./routes/services"));
const requests_1 = __importDefault(require("./routes/requests"));
const businessTrip_1 = __importDefault(require("./routes/businessTrip"));
const performanceAppraisal_1 = __importDefault(require("./routes/performanceAppraisal"));
// API routes
app.use('/api/auth', auth_1.default);
app.use('/api/employees', employees_1.default);
app.use('/api/leaves', leaves_1.default);
app.use('/api/departments', departments_1.default);
app.use('/api/leave-balance', leaveBalance_1.default);
app.use('/api/grab-code-requests', grabCodeRoutes_1.default);
app.use('/api/services', services_1.default);
app.use('/api/requests', requests_1.default);
app.use('/api/business-trips', businessTrip_1.default);
app.use('/api/performance-appraisal', performanceAppraisal_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Only start the server when running locally (not on Vercel serverless)
const isVercel = !!process.env.VERCEL;
if (!isVercel) {
    // Bind to IPv4 to avoid connection issues on localhost
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Backend server with Grab Code API restarted successfully`);
        console.log(`🚀 Leave Request API server is running on port ${PORT}`);
    });
}
// Export the Express app for Vercel serverless
exports.default = app;
//# sourceMappingURL=index.js.map