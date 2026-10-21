import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import apiRoutes from './routes';
import healthRoutes from './routes/health.routes';
import { swaggerSpec } from './swagger/swagger';
import { errorHandler } from './middlewares/error.middleware';

const app: Application = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Swagger UI to render correctly
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads serving
app.use('/uploads', express.static(path.resolve(process.cwd(), config.upload.dir)));

// Swagger OpenAPI documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoints at root level for cloud uptime monitoring
app.use('/health', healthRoutes);

// Main REST API v1
app.use(config.apiPrefix, apiRoutes);

// Root greeting
app.get('/', (req: Request, res: Response) => {
  res.json({
    app: config.appName,
    version: '1.0.0',
    documentation: '/api-docs',
    healthCheck: '/health',
    student: 'Ngo Nguyen Thanh Phuc - 2380601731',
    status: 'online',
  });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Đường dẫn [${req.method}] ${req.originalUrl} không tồn tại trên hệ thống`,
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
