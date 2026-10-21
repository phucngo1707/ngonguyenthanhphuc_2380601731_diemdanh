import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { config } from '../config/env';

const startTime = Date.now();

export const getHealth = async (req: Request, res: Response): Promise<void> => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (e) {
    dbStatus = 'error';
  }

  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.status(dbStatus === 'connected' ? 200 : 503).json({
    status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
    apiName: config.appName,
    version: '1.0.0',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    student: 'Ngo Nguyen Thanh Phuc - MSSV: 2380601731',
  });
};
