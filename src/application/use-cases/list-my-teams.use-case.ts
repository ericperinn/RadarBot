import type { ISubscriptionRepository } from '@application/ports/subscription-repository';
import type { ITeamRepository } from '@application/ports/team-repository';
import type { IUserRepository } from '@application/ports/user-repository';
import type { Subscription } from '@domain/entities/subscription';
import type { Team } from '@domain/entities/team';

export interface ListMyTeamsInput {
  readonly discordUserId: string;
  readonly guildId: string | null;
}

export interface FollowedTeam {
  readonly subscription: Subscription;
  readonly team: Team;
}

export class ListMyTeamsUseCase {
  public constructor(
    private readonly users: IUserRepository,
    private readonly subscriptions: ISubscriptionRepository,
    private readonly teams: ITeamRepository,
  ) {}

  public async execute(input: ListMyTeamsInput): Promise<readonly FollowedTeam[]> {
    const user = await this.users.findByDiscordId(input.discordUserId);
    if (user === null) {
      return [];
    }

    const subs = await this.subscriptions.findByUser(user.id);
    const scoped = input.guildId === null ? subs : subs.filter((s) => s.guildId === input.guildId);
    if (scoped.length === 0) {
      return [];
    }

    const results: FollowedTeam[] = [];
    for (const subscription of scoped) {
      const team = await this.teams.findById(subscription.teamId);
      if (team !== null) {
        results.push({ subscription, team });
      }
    }
    return results;
  }
}
