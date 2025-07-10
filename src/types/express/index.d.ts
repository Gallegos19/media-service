import { User } from '../../../domain/entities/User';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        // Add other user properties as needed
      };
    }
  }
}
