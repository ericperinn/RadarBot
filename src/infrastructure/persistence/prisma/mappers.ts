import type {
  NotificationSent as PrismaNotificationSent,
  Subscription as PrismaSubscription,
  Team as PrismaTeam,
  User as PrismaUser,
  UserSport as PrismaUserSport,
} from '@prisma/client';

import { assertNotificationKind, type NotificationSent } from '@domain/entities/notification-sent';
import type { Subscription } from '@domain/entities/subscription';
import type { Team } from '@domain/entities/team';
import type { User } from '@domain/entities/user';
import type { UserSport } from '@domain/entities/user-sport';
import { assertSport } from '@domain/value-objects/sport';

export function toUser(row: PrismaUser): User {
  return {
    id: row.id,
    discordId: row.discordId,
    createdAt: row.createdAt,
  };
}

export function toUserSport(row: PrismaUserSport): UserSport {
  return {
    userId: row.userId,
    sport: assertSport(row.sport),
    enabledAt: row.enabledAt,
  };
}

export function toTeam(row: PrismaTeam): Team {
  return {
    id: row.id,
    sport: assertSport(row.sport),
    externalId: row.externalId,
    name: row.name,
    logoUrl: row.logoUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toNotificationSent(row: PrismaNotificationSent): NotificationSent {
  return {
    id: row.id,
    subscriptionId: row.subscriptionId,
    externalMatchId: row.externalMatchId,
    kind: assertNotificationKind(row.kind),
    sentAt: row.sentAt,
  };
}

export function toSubscription(row: PrismaSubscription): Subscription {
  return {
    id: row.id,
    userId: row.userId,
    teamId: row.teamId,
    guildId: row.guildId,
    channelId: row.channelId,
    active: row.active,
    createdAt: row.createdAt,
  };
}
