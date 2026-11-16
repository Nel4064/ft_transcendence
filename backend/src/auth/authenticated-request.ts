import type { Request } from 'express';

// What JwtStrategy.validate() attaches to req.user
export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
  };
}