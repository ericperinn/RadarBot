import 'dotenv/config';

export type NodeEnv = 'development' | 'production' | 'test';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AppEnv {
  readonly nodeEnv: NodeEnv;
  readonly logLevel: LogLevel;
  readonly discord: {
    readonly token: string;
    readonly clientId: string;
    readonly devGuildId: string | null;
  };
  readonly database: {
    readonly url: string;
  };
  readonly providers: {
    readonly apiSportsKey: string | null;
    readonly hltvApiKey: string | null;
  };
}

class EnvValidationError extends Error {
  public constructor(missing: readonly string[]) {
    super(`Missing required environment variables: ${missing.join(', ')}`);
    this.name = 'EnvValidationError';
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new EnvValidationError([name]);
  }
  return value;
}

function optional(name: string): string | null {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? null : value;
}

function parseNodeEnv(raw: string | undefined): NodeEnv {
  if (raw === 'production' || raw === 'test' || raw === 'development') {
    return raw;
  }
  return 'development';
}

function parseLogLevel(raw: string | undefined): LogLevel {
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw;
  }
  return 'info';
}

export function loadEnv(): AppEnv {
  const missing: string[] = [];
  const safeRequired = (name: string): string => {
    const value = process.env[name];
    if (value === undefined || value.trim() === '') {
      missing.push(name);
      return '';
    }
    return value;
  };

  const env: AppEnv = {
    nodeEnv: parseNodeEnv(process.env['NODE_ENV']),
    logLevel: parseLogLevel(process.env['LOG_LEVEL']),
    discord: {
      token: safeRequired('DISCORD_TOKEN'),
      clientId: safeRequired('DISCORD_CLIENT_ID'),
      devGuildId: optional('DISCORD_DEV_GUILD_ID'),
    },
    database: {
      url: required('DATABASE_URL'),
    },
    providers: {
      apiSportsKey: optional('API_SPORTS_KEY'),
      hltvApiKey: optional('HLTV_API_KEY'),
    },
  };

  if (missing.length > 0) {
    throw new EnvValidationError(missing);
  }

  return env;
}
