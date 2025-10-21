import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
// Ensure PORT is a number for app.listen
const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(helmet());
// Add both 5173 (dev) and 4173 (preview) to allowed origins during development
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://plugo-hris.vercel.app']
  : ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:5174'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
import authRoutes from './routes/auth';
import employeeRoutes from './routes/employees';
import leaveRoutes from './routes/leaves';
import departmentRoutes from './routes/departments';
import leaveBalanceRoutes from './routes/leaveBalance';
import grabCodeRoutes from './routes/grabCodeRoutes';
import servicesRoutes from './routes/services';
import requestsRoutes from './routes/requests';
import businessTripRoutes from './routes/businessTrip';
import performanceAppraisalRoutes from './routes/performanceAppraisal';

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/leave-balance', leaveBalanceRoutes);
app.use('/api/grab-code-requests', grabCodeRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/business-trips', businessTripRoutes);
app.use('/api/performance-appraisal', performanceAppraisalRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
export default app;