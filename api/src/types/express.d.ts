import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
