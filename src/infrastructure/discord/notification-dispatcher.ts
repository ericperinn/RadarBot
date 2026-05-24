import { type Client, DiscordAPIError, type EmbedBuilder } from 'discord.js';

import type { INotificationSentRepository } from '@application/ports/notification-sent-repository';
import type { ISubscriptionRepository } from '@application/ports/subscription-repository';
import type { PendingNotification } from '@application/use-cases/check-matches.types';
import { finishedMatchEmbed, upcomingMatchEmbed } from '@shared/embeds/match-embeds';
import type { Logger } from '@shared/logger/logger';

const FATAL_DISCORD_ERROR_CODES = new Set<number>([
  10003, // Unknown Channel
  10004, // Unknown Guild
  50001, // Missing Access
  50013, // Missing Permissions
]);

export class NotificationDispatcher {
  public constructor(
    private readonly client: Client,
    private readonly subscriptions: ISubscriptionRepository,
    private readonly notifications: INotificationSentRepository,
    private readonly logger: Logger,
  ) {}

  public async deliver(pending: PendingNotification): Promise<void> {
    const embed = this.buildEmbed(pending);
    try {
      const channel = await this.client.channels.fetch(pending.subscription.channelId);
      if (channel === null || !channel.isSendable()) {
        await this.disableSubscription(pending, 'Channel is not sendable');
        return;
      }
      await channel.send({ embeds: [embed] });
    } catch (error: unknown) {
      if (error instanceof DiscordAPIError && FATAL_DISCORD_ERROR_CODES.has(Number(error.code))) {
        await this.disableSubscription(pending, `Discord error ${error.code.toString()}`);
        return;
      }
      this.logger.error('Notification delivery failed — will retry on next tick', {
        subscriptionId: pending.subscription.id,
        err: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    // Only record after a successful send so transient failures get retried next tick.
    await this.notifications.recordOnce({
      subscriptionId: pending.subscription.id,
      externalMatchId: pending.match.externalId,
      kind: pending.kind,
    });
  }

  private buildEmbed(pending: PendingNotification): EmbedBuilder {
    if (pending.kind === 'upcoming') {
      return upcomingMatchEmbed(pending.team, pending.match);
    }
    return finishedMatchEmbed(pending.team, pending.match);
  }

  private async disableSubscription(pending: PendingNotification, reason: string): Promise<void> {
    this.logger.warn('Deactivating subscription after fatal delivery error', {
      subscriptionId: pending.subscription.id,
      channelId: pending.subscription.channelId,
      reason,
    });
    await this.subscriptions.deactivate(pending.subscription.id);
  }
}
