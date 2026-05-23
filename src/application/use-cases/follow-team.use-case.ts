import type { ISubscriptionRepository } from '@application/ports/subscription-repository';
import type { ITeamRepository } from '@application/ports/team-repository';
import type { IUserRepository } from '@application/ports/user-repository';
import type { IUserSportRepository } from '@application/ports/user-sport-repository';
import type { Subscription } from '@domain/entities/subscription';
import type { Team } from '@domain/entities/team';
import { SportNotEnabledError } from '@domain/errors/domain-error';
import { ProviderError } from '@domain/errors/provider-error';
import type { Sport } from '@domain/value-objects/sport';

import type { SportsProviderRegistry } from '@infrastructure/providers/sports-provider-registry';

export interface FollowTeamInput {
  readonly discordUserId: string;
  readonly sport: Sport;
  readonly externalTeamId: string;
  readonly guildId: string;
  readonly channelId: string;
}

export interface FollowTeamResult {
  readonly subscription: Subscription;
  readonly team: Team;
  readonly alreadyFollowed: boolean;
}

export class FollowTeamUseCase {
  public constructor(
    private readonly users: IUserRepository,
    private readonly userSports: IUserSportRepository,
    private readonly teams: ITeamRepository,
    private readonly subscriptions: ISubscriptionRepository,
    private readonly providers: SportsProviderRegistry,
  ) {}

  public async execute(input: FollowTeamInput): Promise<FollowTeamResult> {
    const user = await this.users.upsertByDiscordId(input.discordUserId);

    const sportEnabled = await this.userSports.isEnabled(user.id, input.sport);
    if (!sportEnabled) {
      throw new SportNotEnabledError(input.sport);
    }

    const provider = this.providers.get(input.sport);
    const remote = await provider.findTeamByExternalId(input.externalTeamId);
    if (remote === null) {
      throw new ProviderError(input.sport, `Team "${input.externalTeamId}" not found.`);
    }

    const team = await this.teams.upsert({
      sport: input.sport,
      externalId: remote.externalId,
      name: remote.name,
      logoUrl: remote.logoUrl,
    });

    const exists = await this.subscriptions.exists(user.id, team.id, input.guildId);
    if (exists) {
      const all = await this.subscriptions.findByUser(user.id);
      const current = all.find((s) => s.teamId === team.id && s.guildId === input.guildId);
      if (current !== undefined) {
        return { subscription: current, team, alreadyFollowed: true };
      }
    }

    const subscription = await this.subscriptions.create({
      userId: user.id,
      teamId: team.id,
      guildId: input.guildId,
      channelId: input.channelId,
    });

    return { subscription, team, alreadyFollowed: false };
  }
}
