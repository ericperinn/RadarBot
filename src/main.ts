import { loadEnv } from '@infrastructure/config/env';
import { createLogger } from '@shared/logger/logger';

function bootstrap(): void {
  const env = loadEnv();
  const logger = createLogger(env.logLevel);

  logger.info('RadarBot booting…', {
    nodeEnv: env.nodeEnv,
    hasDevGuild: env.discord.devGuildId !== null,
    providers: {
      apiSports: env.providers.apiSportsKey !== null,
      hltv: env.providers.hltvApiKey !== null,
    },
  });

  logger.info('Foundation ready. Awaiting next phase.');
}

try {
  bootstrap();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ level: 'error', msg: 'Bootstrap failed', error: message }));
  process.exit(1);
}
