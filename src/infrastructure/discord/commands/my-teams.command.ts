import { type ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';

import type { ListMyTeamsUseCase } from '@application/use-cases/list-my-teams.use-case';
import { infoEmbed } from '@shared/embeds/embed-factory';

import type { Command } from './command';

const SPORT_DISPLAY: Readonly<Record<string, string>> = {
  CS2: 'CS2',
  FOOTBALL: 'Football',
};

export class MyTeamsCommand implements Command {
  public readonly data = new SlashCommandBuilder()
    .setName('my_teams')
    .setDescription('Lists the teams you are following in this server.');

  public constructor(private readonly listMyTeams: ListMyTeamsUseCase) {}

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const followed = await this.listMyTeams.execute({
      discordUserId: interaction.user.id,
      guildId: interaction.guildId,
    });

    if (followed.length === 0) {
      await interaction.reply({
        embeds: [
          infoEmbed({
            title: 'No teams found',
            description: 'Use `/follow` to start following teams.',
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const lines = followed.map(
      ({ team }) => `• **${team.name}** _(${SPORT_DISPLAY[team.sport] ?? team.sport})_`,
    );

    await interaction.reply({
      embeds: [
        infoEmbed({
          title: `Your teams (${followed.length.toString()})`,
          description: lines.join('\n'),
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }
}
