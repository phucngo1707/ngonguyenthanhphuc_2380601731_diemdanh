import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { config } from '../config/env';

const startTime = Date.now();

export const getHealth = (req: Request, res: Response): void => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    version: '1.0.0',
    environment: config.env,
    appName: config.appName,
  });
};

export const getHealthReady = async (req: Request, res: Response): Promise<void> => {
  const checkStart = Date.now();
  try {
    // Perform light database connectivity ping
    await prisma.$queryRaw`SELECT 1`;
    const responseTimeMs = Date.now() - checkStart;

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: 'connected',
      responseTimeMs,
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Database connection failed',
    });
  }
};
