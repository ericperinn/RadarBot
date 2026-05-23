import type { PrismaClient } from '@prisma/client';

import type { IUserSportRepository } from '@application/ports/user-sport-repository';
import type { UserSport } from '@domain/entities/user-sport';
import type { Sport } from '@domain/value-objects/sport';

import { toUserSport } from './mappers';

export class PrismaUserSportRepository implements IUserSportRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async enable(userId: number, sport: Sport): Promise<UserSport> {
    const row = await this.prisma.userSport.upsert({
      where: { userId_sport: { userId, sport } },
      create: { userId, sport },
      update: {},
    });
    return toUserSport(row);
  }

  public async disable(userId: number, sport: Sport): Promise<void> {
    await this.prisma.userSport.deleteMany({ where: { userId, sport } });
  }

  public async isEnabled(userId: number, sport: Sport): Promise<boolean> {
    const row = await this.prisma.userSport.findUnique({
      where: { userId_sport: { userId, sport } },
      select: { userId: true },
    });
    return row !== null;
  }

  public async listByUser(userId: number): Promise<readonly UserSport[]> {
    const rows = await this.prisma.userSport.findMany({ where: { userId } });
    return rows.map(toUserSport);
  }
}
