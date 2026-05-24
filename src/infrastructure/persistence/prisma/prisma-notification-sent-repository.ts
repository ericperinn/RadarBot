import { Prisma, type PrismaClient } from '@prisma/client';

import type {
  INotificationSentRepository,
  NotificationSentRecordInput,
} from '@application/ports/notification-sent-repository';
import type { NotificationSent } from '@domain/entities/notification-sent';

import { toNotificationSent } from './mappers';

const UNIQUE_CONSTRAINT_CODE = 'P2002';

export class PrismaNotificationSentRepository implements INotificationSentRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async exists(input: NotificationSentRecordInput): Promise<boolean> {
    const row = await this.prisma.notificationSent.findUnique({
      where: {
        subscriptionId_externalMatchId_kind: {
          subscriptionId: input.subscriptionId,
          externalMatchId: input.externalMatchId,
          kind: input.kind,
        },
      },
      select: { id: true },
    });
    return row !== null;
  }

  public async recordOnce(input: NotificationSentRecordInput): Promise<NotificationSent | null> {
    try {
      const row = await this.prisma.notificationSent.create({
        data: {
          subscriptionId: input.subscriptionId,
          externalMatchId: input.externalMatchId,
          kind: input.kind,
        },
      });
      return toNotificationSent(row);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_CODE
      ) {
        return null;
      }
      throw error;
    }
  }
}
