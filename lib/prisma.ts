import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  __loccalPrisma?: PrismaClient;
};

export const prisma = globalForPrisma.__loccalPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__loccalPrisma = prisma;
}
