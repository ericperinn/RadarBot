import { buildContainer } from '@infrastructure/composition-root';
import { loadEnv } from '@infrastructure/config/env';
import { registerSlashCommands } from '@infrastructure/discord/register-commands';
import {
  disconnectPrisma,
  getPrismaClient,
} from '@infrastructure/persistence/prisma/prisma-client';
import { createLogger } from '@shared/logger/logger';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env.logLevel);

  logger.info('RadarBot booting…', {
    nodeEnv: env.nodeEnv,
    hasDevGuild: env.discord.devGuildId !== null,
    providers: {
      apiSports: env.providers.apiSportsKey !== null,
      hltv: true,
    },
  });

  const prisma = getPrismaClient();
  const container = buildContainer(env, prisma, logger);

  await registerSlashCommands(
    {
      token: env.discord.token,
      clientId: env.discord.clientId,
      devGuildId: env.discord.devGuildId,
      commands: container.commands,
    },
    logger,
  );

  await container.bot.start({ token: env.discord.token });
  container.scheduler.start();

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info('Shutting down', { signal });
    void (async (): Promise<void> => {
      container.scheduler.stop();
      await container.bot.stop().catch(() => undefined);
      await disconnectPrisma().catch(() => undefined);
      process.exit(0);
    })();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ level: 'error', msg: 'Bootstrap failed', error: message }));
  process.exit(1);
});
