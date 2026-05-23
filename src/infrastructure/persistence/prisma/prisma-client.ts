import { PrismaClient } from '@prisma/client';

let instance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (instance === null) {
    instance = new PrismaClient();
  }
  return instance;
}

export async function disconnectPrisma(): Promise<void> {
  if (instance !== null) {
    await instance.$disconnect();
    instance = null;
  }
}
