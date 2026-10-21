import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../types/express';

export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export const signAccessToken = (user: AuthenticatedUser): string => {
  const payload: TokenPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  };

  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiration as jwt.SignOptions['expiresIn'],
  });
};

export const verifyAccessToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
  } catch {
    return null;
  }
};
