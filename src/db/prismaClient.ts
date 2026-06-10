import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prismaClient: PrismaClient };

export const prismaClient =
  globalForPrisma.prismaClient ||
  new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaClient = prismaClient;
}
