import type { PrismaClient } from '@prisma/client';

import { AddSportUseCase } from '@application/use-cases/add-sport.use-case';
import { FollowTeamUseCase } from '@application/use-cases/follow-team.use-case';
import { ListMyTeamsUseCase } from '@application/use-cases/list-my-teams.use-case';

import type { AppEnv } from '@infrastructure/config/env';
import { AddSportCommand } from '@infrastructure/discord/commands/add-sport.command';
import type { Command } from '@infrastructure/discord/commands/command';
import { FollowCommand } from '@infrastructure/discord/commands/follow.command';
import { MyTeamsCommand } from '@infrastructure/discord/commands/my-teams.command';
import { DiscordBot } from '@infrastructure/discord/discord-bot';
import { InteractionDispatcher } from '@infrastructure/discord/events/interaction-dispatcher';
import { PrismaSubscriptionRepository } from '@infrastructure/persistence/prisma/prisma-subscription-repository';
import { PrismaTeamRepository } from '@infrastructure/persistence/prisma/prisma-team-repository';
import { PrismaUserRepository } from '@infrastructure/persistence/prisma/prisma-user-repository';
import { PrismaUserSportRepository } from '@infrastructure/persistence/prisma/prisma-user-sport-repository';
import { CachedSportsProvider } from '@infrastructure/providers/cache/cached-sports-provider';
import { FootballApiProvider } from '@infrastructure/providers/football-api/football-api-provider';
import { HltvProvider } from '@infrastructure/providers/hltv/hltv-provider';
import type { ISportsProvider } from '@application/ports/sports-provider';
import { SportsProviderRegistry } from '@infrastructure/providers/sports-provider-registry';

import type { Logger } from '@shared/logger/logger';

export interface Container {
  readonly commands: readonly Command[];
  readonly dispatcher: InteractionDispatcher;
  readonly bot: DiscordBot;
}

export function buildContainer(env: AppEnv, prisma: PrismaClient, logger: Logger): Container {
  // Repositories
  const users = new PrismaUserRepository(prisma);
  const userSports = new PrismaUserSportRepository(prisma);
  const teams = new PrismaTeamRepository(prisma);
  const subscriptions = new PrismaSubscriptionRepository(prisma);

  // Providers (decorated with autocomplete cache)
  const providerList: ISportsProvider[] = [new CachedSportsProvider(new HltvProvider())];
  if (env.providers.apiSportsKey !== null) {
    providerList.push(
      new CachedSportsProvider(new FootballApiProvider({ apiKey: env.providers.apiSportsKey })),
    );
  } else {
    logger.warn('API_SPORTS_KEY not set — FOOTBALL provider disabled.');
  }
  const providers = new SportsProviderRegistry(providerList);

  // Use cases
  const addSport = new AddSportUseCase(users, userSports);
  const followTeam = new FollowTeamUseCase(users, userSports, teams, subscriptions, providers);
  const listMyTeams = new ListMyTeamsUseCase(users, subscriptions, teams);

  // Commands
  const commands: readonly Command[] = [
    new AddSportCommand(addSport),
    new FollowCommand(followTeam, providers),
    new MyTeamsCommand(listMyTeams),
  ];

  const dispatcher = new InteractionDispatcher(commands, logger);
  const bot = new DiscordBot(dispatcher, logger);

  return { commands, dispatcher, bot };
}
