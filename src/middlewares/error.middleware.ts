import { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/infrastructure/logger';
import { HttpException } from '../exceptions/HttpException';

const errorMiddleware = (
  error: HttpException,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const status: number = error.status || 500;
    const message: string = error.message || 'Something went wrong';
    const errorCode: string = error.errorCode || 'INTERNAL_SERVER_ERROR';
    const errors: any = error.errors || {};

    logger.error(`[${req.method}] ${req.path} >> StatusCode:: ${status}, Message:: ${message}`);
    
    if (process.env.NODE_ENV === 'development') {
      logger.error(error.stack);
    }

    res.status(status).json({
      success: false,
      status,
      errorCode,
      message,
      errors,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  } catch (error) {
    next(error);
  }
};

export default errorMiddleware;
