import type { ISubscriptionRepository } from '@application/ports/subscription-repository';
import type { ITeamRepository } from '@application/ports/team-repository';
import type { IUserRepository } from '@application/ports/user-repository';
import type { Team } from '@domain/entities/team';
import { DomainError } from '@domain/errors/domain-error';

export class SubscriptionNotFoundError extends DomainError {
  public constructor() {
    super('Subscription not found or does not belong to you in this server.');
  }
}

export interface UnfollowTeamInput {
  readonly discordUserId: string;
  readonly subscriptionId: number;
  readonly guildId: string;
}

export interface UnfollowTeamResult {
  readonly team: Team;
}

export class UnfollowTeamUseCase {
  public constructor(
    private readonly users: IUserRepository,
    private readonly subscriptions: ISubscriptionRepository,
    private readonly teams: ITeamRepository,
  ) {}

  public async execute(input: UnfollowTeamInput): Promise<UnfollowTeamResult> {
    const user = await this.users.findByDiscordId(input.discordUserId);
    if (user === null) {
      throw new SubscriptionNotFoundError();
    }

    const subscription = await this.subscriptions.findById(input.subscriptionId);
    if (
      subscription === null ||
      subscription.userId !== user.id ||
      subscription.guildId !== input.guildId
    ) {
      throw new SubscriptionNotFoundError();
    }

    const team = await this.teams.findById(subscription.teamId);

    await this.subscriptions.delete(subscription.id);

    // team should always exist at this point, but guard defensively
    if (team === null) {
      throw new SubscriptionNotFoundError();
    }

    return { team };
  }
}
