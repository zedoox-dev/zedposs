import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

// 🔥 VERCEL BUILD FIX: Purana code 100% safe hai, bas ye ek line naye pages ki error fix karne ke liye add ki hai!
export const db = prisma;
