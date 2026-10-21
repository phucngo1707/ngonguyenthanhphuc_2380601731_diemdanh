import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env';
import apiRoutes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './swagger/swagger.doc';

const app: Application = express();

// CORS
app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads serving
app.use('/uploads', express.static(path.resolve(process.cwd(), config.upload.dir)));

// Main API routes (/api/v1 and /api)
app.use('/api/v1', apiRoutes);
app.use('/api', apiRoutes);

// Swagger API Documentation UI
const swaggerOptions = {
  customSiteTitle: 'PRIME Attendance API - Swagger UI (Ngo Nguyen Thanh Phuc - 2380601731)',
};
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
app.get('/api/docs.json', (req: Request, res: Response) => {
  res.json(swaggerDocument);
});

// Root greeting
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: config.appName,
    version: '1.0.0',
    student: 'Ngo Nguyen Thanh Phuc - 2380601731',
    database: 'DB_NgoNguyenThanhPhuc_2380601731_DiemDanh',
    status: 'online',
    swaggerUi: '/docs',
    endpoints: {
      swagger: '/docs',
      auth: `${config.apiPrefix}/auth`,
      users: `${config.apiPrefix}/users`,
      classes: `${config.apiPrefix}/classes`,
      sessions: `${config.apiPrefix}/attendance-sessions`,
      attendance: `${config.apiPrefix}/attendance`,
      leaveRequests: `${config.apiPrefix}/leave-requests`,
      health: `${config.apiPrefix}/health`,
    },
  });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Đường dẫn [${req.method}] ${req.originalUrl} không tồn tại`,
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
