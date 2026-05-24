import type { INotificationSentRepository } from '@application/ports/notification-sent-repository';
import type { ISubscriptionRepository } from '@application/ports/subscription-repository';
import type { ITeamRepository } from '@application/ports/team-repository';

import type { SportsProviderRegistry } from '@infrastructure/providers/sports-provider-registry';
import type { Logger } from '@shared/logger/logger';

import type { PendingNotification } from './check-matches.types';

export interface CheckFinishedMatchesParams {
  readonly lookbackMs: number;
}

export class CheckFinishedMatchesUseCase {
  public constructor(
    private readonly subscriptions: ISubscriptionRepository,
    private readonly teams: ITeamRepository,
    private readonly providers: SportsProviderRegistry,
    private readonly notifications: INotificationSentRepository,
    private readonly logger: Logger,
  ) {}

  public async execute(
    params: CheckFinishedMatchesParams,
  ): Promise<readonly PendingNotification[]> {
    const subs = await this.subscriptions.listActive();
    const since = new Date(Date.now() - params.lookbackMs);
    const pending: PendingNotification[] = [];

    for (const subscription of subs) {
      const team = await this.teams.findById(subscription.teamId);
      if (team === null || !this.providers.has(team.sport)) {
        continue;
      }
      const provider = this.providers.get(team.sport);
      let matches;
      try {
        matches = await provider.getFinishedMatches(team.externalId, since);
      } catch (error: unknown) {
        this.logger.warn('Finished matches fetch failed', {
          team: team.name,
          err: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      for (const match of matches) {
        const alreadyNotified = await this.notifications.exists({
          subscriptionId: subscription.id,
          externalMatchId: match.externalId,
          kind: 'finished',
        });
        if (alreadyNotified) {
          continue;
        }
        pending.push({ subscription, team, match, kind: 'finished' });
      }
    }

    return pending;
  }
}
