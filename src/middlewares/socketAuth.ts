import { Socket, ExtendedError } from 'socket.io';
import { Jtoken } from './Jtoken';
import { JWT_SECRET } from '../secrets';
import { JWTPayload } from '../utils/types';

const tokenService = new Jtoken(JWT_SECRET);

export type AuthenticatedSocket = Socket & {
  data: {
    userId?: string;
    user?: JWTPayload;
  };
};

function extractToken(socket: Socket): string | null {
  const auth = socket.handshake.auth as { token?: string } | undefined;
  if (auth?.token && typeof auth.token === 'string') {
    return auth.token;
  }

  const header = socket.handshake.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }

  const queryToken = socket.handshake.query?.token;
  if (typeof queryToken === 'string' && queryToken.length > 0) {
    return queryToken;
  }

  return null;
}

/**
 * Socket.IO middleware: require a valid JWT and attach userId to socket.data.
 * Unauthenticated sockets are rejected.
 */
export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: ExtendedError) => void
) {
  try {
    const token = extractToken(socket);
    if (!token) {
      return next(new Error('Unauthorized: missing socket auth token'));
    }

    const payload = await tokenService.decodeToken(token);
    if (!payload?.id) {
      return next(new Error('Unauthorized: invalid socket auth token'));
    }

    (socket as AuthenticatedSocket).data.userId = payload.id;
    (socket as AuthenticatedSocket).data.user = payload;
    return next();
  } catch (error) {
    return next(new Error('Unauthorized: socket auth failed'));
  }
}

/** Only allow joining rooms for the authenticated user. */
export function assertSocketOwnsUserId(
  socket: AuthenticatedSocket,
  requestedUserId: unknown
): string | null {
  const authUserId = socket.data.userId;
  if (!authUserId) return null;
  if (typeof requestedUserId !== 'string' || !requestedUserId) return null;
  if (requestedUserId !== authUserId) return null;
  return authUserId;
}
