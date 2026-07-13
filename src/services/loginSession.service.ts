import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { NotificationCategory } from '@prisma/client';
import { prismaClient } from '..';
import NotificationService from './notification.service';
import { sendPreferenceAwareMail } from '../utils/sendPreferenceAwareMail';
import { getClientIpFromRequest } from '../utils/currencyContext';
import loggers from '../utils/loggers';

const ACCESS_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export type SessionRequest = {
  headers: Record<string, unknown>;
  ip?: string;
  socket?: { remoteAddress?: string };
  user?: { id?: string; email?: string | null };
};

export function hashAccessToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseDeviceLabel(userAgent?: string | null): string {
  if (!userAgent) return 'Unknown device';
  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad')) return 'Apple mobile';
  if (ua.includes('android')) return 'Android device';
  if (ua.includes('mac os')) return 'Mac';
  if (ua.includes('windows')) return 'Windows PC';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('chrome')) return 'Chrome browser';
  if (ua.includes('firefox')) return 'Firefox browser';
  if (ua.includes('safari')) return 'Safari browser';
  return 'Web browser';
}

export function extractBearerToken(req: {
  headers: Record<string, unknown>;
}): string | null {
  const header = req.headers.authorization || req.headers.Authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== 'string' || !value.startsWith('Bearer ')) return null;
  return value.slice(7).trim() || null;
}

function resolveTokenExpiry(accessToken: string): Date {
  try {
    const decoded = jwt.decode(accessToken) as { exp?: number } | null;
    if (decoded?.exp) {
      return new Date(decoded.exp * 1000);
    }
  } catch {
    // fall through to default TTL
  }
  return new Date(Date.now() + ACCESS_TOKEN_TTL_MS);
}

function readSessionMeta(req: SessionRequest) {
  const userAgent =
    typeof req.headers['user-agent'] === 'string'
      ? req.headers['user-agent']
      : null;
  const ipAddress = getClientIpFromRequest(req);
  const deviceLabel = parseDeviceLabel(userAgent);
  return { userAgent, ipAddress, deviceLabel };
}

class LoginSessionService {
  /**
   * Ensures the current bearer token has a session row (backfill for tokens issued
   * before session tracking). Does not send login alerts unless notify is true.
   */
  async ensureSessionFromRequest(
    req: SessionRequest,
    options?: { notify?: boolean; touchActivity?: boolean }
  ) {
    const userId = req.user?.id;
    const token = extractBearerToken(req);
    if (!userId || !token) return null;

    const tokenHash = hashAccessToken(token);
    const expiresAt = resolveTokenExpiry(token);
    const { userAgent, ipAddress, deviceLabel } = readSessionMeta(req);

    const existing = await prismaClient.userLoginSession.findUnique({
      where: { tokenHash },
    });

    if (existing) {
      if (existing.revokedAt) return null;

      if (options?.touchActivity) {
        await prismaClient.userLoginSession.update({
          where: { id: existing.id },
          data: {
            lastActiveAt: new Date(),
            expiresAt,
            userAgent: userAgent ?? existing.userAgent,
            ipAddress: ipAddress || existing.ipAddress,
            deviceLabel: deviceLabel ?? existing.deviceLabel,
          },
        });
      } else if (ipAddress && !existing.ipAddress) {
        await prismaClient.userLoginSession.update({
          where: { id: existing.id },
          data: { ipAddress },
        });
      }
      return existing;
    }

    const session = await prismaClient.userLoginSession.create({
      data: {
        userId,
        tokenHash,
        userAgent,
        ipAddress,
        deviceLabel,
        expiresAt,
      },
    });

    if (options?.notify) {
      await this.notifyLoginActivity({
        userId,
        userEmail: req.user?.email,
        deviceLabel,
        ipAddress,
      });
    }

    return session;
  }

  async recordLogin(params: {
    userId: string;
    accessToken: string;
    req: SessionRequest;
    userEmail?: string | null;
  }) {
    const { userId, accessToken, req, userEmail } = params;
    const reqWithUser: SessionRequest = {
      ...req,
      headers: {
        ...req.headers,
        authorization: `Bearer ${accessToken}`,
      },
      user: { id: userId, email: userEmail },
    };

    return this.ensureSessionFromRequest(reqWithUser, { notify: true });
  }

  private async notifyLoginActivity(params: {
    userId: string;
    userEmail?: string | null;
    deviceLabel: string;
    ipAddress?: string;
  }) {
    const { userId, userEmail, deviceLabel, ipAddress } = params;
    const location = ipAddress ? ` from ${ipAddress}` : '';
    const title = 'New login to your account';
    const message = `Signed in on ${deviceLabel}${location}.`;

    await NotificationService.createNotification(
      {
        destId: userId,
        title,
        message,
        category: NotificationCategory.SECURITY,
        notificationType: 'login_activity',
        route: '/settings',
        emitRealtime: true,
        type: 'warning',
      },
      NotificationCategory.SECURITY
    );

    if (userEmail) {
      await sendPreferenceAwareMail({
        userId,
        category: NotificationCategory.SECURITY,
        notificationType: 'login_activity',
        to: userEmail,
        subject: title,
        html: `<p>${message}</p><p>If this wasn't you, change your password and review active sessions in Settings.</p>`,
      }).catch(err => {
        loggers.warn('Login activity email failed', err);
      });
    }
  }

  async listSessions(userId: string, currentToken?: string | null) {
    const currentHash = currentToken ? hashAccessToken(currentToken) : null;
    const now = new Date();

    const rows = await prismaClient.userLoginSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    return rows.map(row => ({
      id: row.id,
      deviceLabel: row.deviceLabel || 'Unknown device',
      userAgent: row.userAgent,
      ipAddress: row.ipAddress,
      lastActiveAt: row.lastActiveAt,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      isCurrent: currentHash ? row.tokenHash === currentHash : false,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await prismaClient.userLoginSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) return false;

    await prismaClient.userLoginSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    return true;
  }

  async revokeCurrentSession(req: SessionRequest) {
    const userId = req.user?.id;
    const token = extractBearerToken(req);
    if (!userId || !token) return false;

    const tokenHash = hashAccessToken(token);
    const session = await prismaClient.userLoginSession.findFirst({
      where: { userId, tokenHash, revokedAt: null },
    });
    if (!session) return false;

    await prismaClient.userLoginSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return true;
  }

  async revokeOtherSessions(userId: string, currentToken: string) {
    const currentHash = hashAccessToken(currentToken);
    await prismaClient.userLoginSession.updateMany({
      where: {
        userId,
        tokenHash: { not: currentHash },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }
}

export default new LoginSessionService();
