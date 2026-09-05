import express from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import { errorHandler } from './middlewares/errorHandler';

// Route imports
import authRoutes       from './routes/authRoutes';
import userRoutes       from './routes/userRoutes';
import employeeRoutes   from './routes/employeeRoutes';
import contractRoutes   from './routes/contractRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import timeOffRoutes    from './routes/timeOffRoutes';
import scheduleRoutes   from './routes/scheduleRoutes';
import payrollRoutes    from './routes/payrollRoutes';
import dashboardRoutes  from './routes/dashboardRoutes';

const app = express();

// Core Middleware
app.use(cors({ origin: ENV.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    service:   'PeoplePay360 API',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes (/api/v1)
const BASE = '/api/v1';

app.use(`${BASE}/auth`,        authRoutes);
app.use(`${BASE}/users`,       userRoutes);
app.use(`${BASE}/employees`,   employeeRoutes);
app.use(`${BASE}/contracts`,   contractRoutes);
app.use(`${BASE}/attendance`,  attendanceRoutes);
app.use(`${BASE}/time-off`,    timeOffRoutes);
app.use(`${BASE}/schedules`,   scheduleRoutes);
app.use(`${BASE}/payroll`,     payrollRoutes);
app.use(`${BASE}/dashboard`,   dashboardRoutes);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global Error Handler
app.use(errorHandler);

// Start Server
app.listen(ENV.PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   PeoplePay360 API — v1.0.0                ║
║   Running on  : http://localhost:${ENV.PORT}       ║
║   Environment : ${ENV.NODE_ENV.padEnd(26)}║
╚════════════════════════════════════════════╝
  `);
});

export default app;
