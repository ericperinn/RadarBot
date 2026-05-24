import type { PrismaClient } from '@prisma/client';

import type { ISportsProvider } from '@application/ports/sports-provider';
import { AddSportUseCase } from '@application/use-cases/add-sport.use-case';
import { CheckFinishedMatchesUseCase } from '@application/use-cases/check-finished-matches.use-case';
import { CheckUpcomingMatchesUseCase } from '@application/use-cases/check-upcoming-matches.use-case';
import { FollowTeamUseCase } from '@application/use-cases/follow-team.use-case';
import { ListMyTeamsUseCase } from '@application/use-cases/list-my-teams.use-case';

import type { AppEnv } from '@infrastructure/config/env';
import { AddSportCommand } from '@infrastructure/discord/commands/add-sport.command';
import type { Command } from '@infrastructure/discord/commands/command';
import { FollowCommand } from '@infrastructure/discord/commands/follow.command';
import { MyTeamsCommand } from '@infrastructure/discord/commands/my-teams.command';
import { DiscordBot } from '@infrastructure/discord/discord-bot';
import { InteractionDispatcher } from '@infrastructure/discord/events/interaction-dispatcher';
import { NotificationDispatcher } from '@infrastructure/discord/notification-dispatcher';
import { PrismaNotificationSentRepository } from '@infrastructure/persistence/prisma/prisma-notification-sent-repository';
import { PrismaSubscriptionRepository } from '@infrastructure/persistence/prisma/prisma-subscription-repository';
import { PrismaTeamRepository } from '@infrastructure/persistence/prisma/prisma-team-repository';
import { PrismaUserRepository } from '@infrastructure/persistence/prisma/prisma-user-repository';
import { PrismaUserSportRepository } from '@infrastructure/persistence/prisma/prisma-user-sport-repository';
import { CachedSportsProvider } from '@infrastructure/providers/cache/cached-sports-provider';
import { FootballApiProvider } from '@infrastructure/providers/football-api/football-api-provider';
import { HltvProvider } from '@infrastructure/providers/hltv/hltv-provider';
import { SportsProviderRegistry } from '@infrastructure/providers/sports-provider-registry';
import { MatchScheduler } from '@infrastructure/workers/match-scheduler';

import type { Logger } from '@shared/logger/logger';

const SCHEDULER_TICK_MS = 10 * 60 * 1_000;
const UPCOMING_HORIZON_MS = 60 * 60 * 1_000;
const FINISHED_LOOKBACK_MS = 24 * 60 * 60 * 1_000;

export interface Container {
  readonly commands: readonly Command[];
  readonly dispatcher: InteractionDispatcher;
  readonly bot: DiscordBot;
  readonly scheduler: MatchScheduler;
}

export function buildContainer(env: AppEnv, prisma: PrismaClient, logger: Logger): Container {
  // Repositories
  const users = new PrismaUserRepository(prisma);
  const userSports = new PrismaUserSportRepository(prisma);
  const teams = new PrismaTeamRepository(prisma);
  const subscriptions = new PrismaSubscriptionRepository(prisma);
  const notifications = new PrismaNotificationSentRepository(prisma);

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

  // Interactive use cases
  const addSport = new AddSportUseCase(users, userSports);
  const followTeam = new FollowTeamUseCase(users, userSports, teams, subscriptions, providers);
  const listMyTeams = new ListMyTeamsUseCase(users, subscriptions, teams);

  // Background use cases
  const checkUpcoming = new CheckUpcomingMatchesUseCase(
    subscriptions,
    teams,
    providers,
    notifications,
    logger,
  );
  const checkFinished = new CheckFinishedMatchesUseCase(
    subscriptions,
    teams,
    providers,
    notifications,
    logger,
  );

  // Commands
  const commands: readonly Command[] = [
    new AddSportCommand(addSport),
    new FollowCommand(followTeam, providers),
    new MyTeamsCommand(listMyTeams),
  ];

  const dispatcher = new InteractionDispatcher(commands, logger);
  const bot = new DiscordBot(dispatcher, logger);

  const notificationDispatcher = new NotificationDispatcher(
    bot.client,
    subscriptions,
    notifications,
    logger,
  );
  const scheduler = new MatchScheduler(
    checkUpcoming,
    checkFinished,
    notificationDispatcher,
    logger,
    {
      tickIntervalMs: SCHEDULER_TICK_MS,
      upcomingHorizonMs: UPCOMING_HORIZON_MS,
      finishedLookbackMs: FINISHED_LOOKBACK_MS,
    },
  );

  return { commands, dispatcher, bot, scheduler };
}
