import { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { BadRequestException } from '../exceptions/HttpException';

export const validationMiddleware = (type: any, property: 'body' | 'query' | 'params' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Convert plain object to class instance
      const dto = plainToInstance(type, req[property]);
      
      // Validate the object
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
        validationError: { target: false },
      });

      if (errors.length > 0) {
        const message = errors.map((error: ValidationError) => 
          Object.values(error.constraints || {}).join(', ')
        ).join('; ');
        
        throw new BadRequestException(message);
      }

      // Replace request body with validated and transformed object
      req[property] = dto;
      next();
    } catch (error) {
      next(error);
    }
  };
};
