import type { ChatInputCommandInteraction, Interaction } from 'discord.js';
import { MessageFlags } from 'discord.js';

import { ProviderError, ProviderRateLimitError } from '@domain/errors/provider-error';
import { DomainError } from '@domain/errors/domain-error';
import type { Logger } from '@shared/logger/logger';
import { errorEmbed } from '@shared/embeds/embed-factory';

import type { Command } from '@infrastructure/discord/commands/command';

export class InteractionDispatcher {
  private readonly commands: ReadonlyMap<string, Command>;

  public constructor(
    commands: readonly Command[],
    private readonly logger: Logger,
  ) {
    const map = new Map<string, Command>();
    for (const cmd of commands) {
      map.set(cmd.data.name, cmd);
    }
    this.commands = map;
  }

  public async dispatch(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) {
      const cmd = this.commands.get(interaction.commandName);
      if (cmd === undefined) {
        this.logger.warn('Unknown command received', { name: interaction.commandName });
        return;
      }
      try {
        await cmd.execute(interaction);
      } catch (error: unknown) {
        await this.handleExecuteError(interaction, error);
      }
      return;
    }

    if (interaction.isAutocomplete()) {
      const cmd = this.commands.get(interaction.commandName);
      if (cmd === undefined || cmd.autocomplete === undefined) {
        return;
      }
      try {
        await cmd.autocomplete(interaction);
      } catch (error: unknown) {
        this.logger.error('Autocomplete failure', {
          name: interaction.commandName,
          err: error instanceof Error ? error.message : String(error),
        });
        if (!interaction.responded) {
          await interaction.respond([]).catch(() => undefined);
        }
      }
    }
  }

  private async handleExecuteError(
    interaction: ChatInputCommandInteraction,
    error: unknown,
  ): Promise<void> {
    const { title, description } = this.describeError(error);
    this.logger.error('Command execution failure', {
      name: interaction.commandName,
      err: error instanceof Error ? error.message : String(error),
    });

    const embed = errorEmbed({ title, description });
    const payload = { embeds: [embed], flags: MessageFlags.Ephemeral } as const;

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => undefined);
    } else {
      await interaction.reply(payload).catch(() => undefined);
    }
  }

  private describeError(error: unknown): { title: string; description: string } {
    if (error instanceof ProviderRateLimitError) {
      return {
        title: 'Limite de requisições atingido',
        description: 'O provedor externo está pedindo para aguardar. Tente novamente em instantes.',
      };
    }
    if (error instanceof ProviderError) {
      return { title: 'Falha ao consultar provedor', description: error.message };
    }
    if (error instanceof DomainError) {
      return { title: 'Operação inválida', description: error.message };
    }
    return {
      title: 'Erro inesperado',
      description: 'Algo deu errado processando seu comando.',
    };
  }
}
