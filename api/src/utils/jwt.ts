import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../types/express';
import { prisma } from '../config/prisma';
import crypto from 'crypto';

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

export const signRefreshToken = async (user: AuthenticatedUser): Promise<string> => {
  const payload = {
    userId: user.id,
    random: crypto.randomBytes(16).toString('hex'),
  };

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiration as jwt.SignOptions['expiresIn'],
  });

  // Calculate expiration date (default 30 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Store hashed refresh token in database for revocation capability
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return refreshToken;
};

export const verifyAccessToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
  } catch {
    return null;
  }
};

export const verifyAndRotateRefreshToken = async (
  token: string
): Promise<{ user: AuthenticatedUser } | null> => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as { userId: string };
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      return null;
    }

    // Revoke old refresh token on rotation
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const user: AuthenticatedUser = {
      id: storedToken.user.id,
      username: storedToken.user.username,
      email: storedToken.user.email,
      role: storedToken.user.role,
      fullName: storedToken.user.fullName,
    };

    return { user };
  } catch {
    return null;
  }
};

export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
};
