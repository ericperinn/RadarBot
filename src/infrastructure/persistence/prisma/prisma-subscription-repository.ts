import type { PrismaClient } from '@prisma/client';

import type {
  ISubscriptionRepository,
  SubscriptionCreateInput,
} from '@application/ports/subscription-repository';
import type { Subscription } from '@domain/entities/subscription';

import { toSubscription } from './mappers';

export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async create(input: SubscriptionCreateInput): Promise<Subscription> {
    const row = await this.prisma.subscription.create({ data: input });
    return toSubscription(row);
  }

  public async delete(id: number): Promise<void> {
    await this.prisma.subscription.delete({ where: { id } });
  }

  public async findById(id: number): Promise<Subscription | null> {
    const row = await this.prisma.subscription.findUnique({ where: { id } });
    return row === null ? null : toSubscription(row);
  }

  public async findByUser(userId: number): Promise<readonly Subscription[]> {
    const rows = await this.prisma.subscription.findMany({ where: { userId } });
    return rows.map(toSubscription);
  }

  public async findByTeam(teamId: number): Promise<readonly Subscription[]> {
    const rows = await this.prisma.subscription.findMany({ where: { teamId } });
    return rows.map(toSubscription);
  }

  public async exists(userId: number, teamId: number, guildId: string): Promise<boolean> {
    const row = await this.prisma.subscription.findUnique({
      where: { userId_teamId_guildId: { userId, teamId, guildId } },
      select: { id: true },
    });
    return row !== null;
  }

  public async listActive(): Promise<readonly Subscription[]> {
    const rows = await this.prisma.subscription.findMany({ where: { active: true } });
    return rows.map(toSubscription);
  }

  public async deactivate(id: number): Promise<void> {
    await this.prisma.subscription.update({ where: { id }, data: { active: false } });
  }
}
