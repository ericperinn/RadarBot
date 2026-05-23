import { REST, Routes } from 'discord.js';

import type { Logger } from '@shared/logger/logger';

import { toCommandJson, type Command } from './commands/command';

export interface RegisterCommandsParams {
  readonly token: string;
  readonly clientId: string;
  readonly devGuildId: string | null;
  readonly commands: readonly Command[];
}

export async function registerSlashCommands(
  params: RegisterCommandsParams,
  logger: Logger,
): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(params.token);
  const body = params.commands.map(toCommandJson);

  if (params.devGuildId !== null) {
    await rest.put(Routes.applicationGuildCommands(params.clientId, params.devGuildId), { body });
    logger.info('Registered guild commands (dev)', {
      guildId: params.devGuildId,
      count: body.length,
    });
    return;
  }

  await rest.put(Routes.applicationCommands(params.clientId), { body });
  logger.info('Registered global commands', { count: body.length });
}
