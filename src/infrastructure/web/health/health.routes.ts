import { Router, Request, Response } from 'express';
import { Routes } from '../../../interfaces';
import { logger } from '../../../shared';
import { prisma } from '../../../infrastructure';

class HealthRoutes implements Routes {
  public path = '/health';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Health check endpoint
    this.router.get(`${this.path}`, this.healthCheck);
    
    // Database health check
    this.router.get(`${this.path}/db`, this.databaseHealthCheck);
  }

  private healthCheck = async (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  };

  private databaseHealthCheck = async (req: Request, res: Response) => {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;
      
      res.status(200).json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Database health check failed:', error);
      
      res.status(503).json({
        status: 'error',
        database: 'disconnected',
        error: 'Database connection failed',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

export default HealthRoutes;
