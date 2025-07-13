import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@config';
import { UnauthorizedException } from '../exceptions/HttpException';

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }
    next();
    // // Verify token
    // jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    //   if (err) {
    //     throw new UnauthorizedException('Invalid or expired token');
    //   }
      
    //   // Attach user to request object
    //   req.user = user;
    //   next();
    // });
  } catch (error) {
    next(error);
  }
};

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
