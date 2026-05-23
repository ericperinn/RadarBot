import type { LogLevel } from '@infrastructure/config/env';

const LEVEL_WEIGHT: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface Logger {
  debug(message: string, meta?: Readonly<Record<string, unknown>>): void;
  info(message: string, meta?: Readonly<Record<string, unknown>>): void;
  warn(message: string, meta?: Readonly<Record<string, unknown>>): void;
  error(message: string, meta?: Readonly<Record<string, unknown>>): void;
}

export function createLogger(minLevel: LogLevel): Logger {
  const threshold = LEVEL_WEIGHT[minLevel];

  const log = (
    level: LogLevel,
    message: string,
    meta?: Readonly<Record<string, unknown>>,
  ): void => {
    if (LEVEL_WEIGHT[level] < threshold) {
      return;
    }
    const payload = {
      ts: new Date().toISOString(),
      level,
      msg: message,
      ...(meta ?? {}),
    };
    const line = JSON.stringify(payload);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.info(line);
    }
  };

  return {
    debug: (msg, meta) => log('debug', msg, meta),
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
  };
}
