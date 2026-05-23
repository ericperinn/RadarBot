import type { PrismaClient } from '@prisma/client';

import type { IUserRepository } from '@application/ports/user-repository';
import type { User } from '@domain/entities/user';

import { toUser } from './mappers';

export class PrismaUserRepository implements IUserRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findByDiscordId(discordId: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { discordId } });
    return row === null ? null : toUser(row);
  }

  public async upsertByDiscordId(discordId: string): Promise<User> {
    const row = await this.prisma.user.upsert({
      where: { discordId },
      create: { discordId },
      update: {},
    });
    return toUser(row);
  }
}
