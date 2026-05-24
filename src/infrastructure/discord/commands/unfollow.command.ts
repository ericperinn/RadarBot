import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import type { ListMyTeamsUseCase } from '@application/use-cases/list-my-teams.use-case';
import { type UnfollowTeamUseCase } from '@application/use-cases/unfollow-team.use-case';
import type { Sport } from '@domain/value-objects/sport';
import { errorEmbed, successEmbed } from '@shared/embeds/embed-factory';

import type { Command } from './command';

const SUBCOMMAND_TO_SPORT: Readonly<Record<string, Sport>> = {
  cs2: 'CS2',
  football: 'FOOTBALL',
};

const TEAM_OPTION = 'team';

export class UnfollowCommand implements Command {
  public readonly data = new SlashCommandBuilder()
    .setName('unfollow')
    .setDescription('Stop following a team and cancel its notifications.')
    .addSubcommand((sub) =>
      sub
        .setName('cs2')
        .setDescription('Unfollow a CS2 team')
        .addStringOption((opt) =>
          opt
            .setName(TEAM_OPTION)
            .setDescription('Team to unfollow')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('football')
        .setDescription('Unfollow a football team')
        .addStringOption((opt) =>
          opt
            .setName(TEAM_OPTION)
            .setDescription('Team to unfollow')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    );

  public constructor(
    private readonly unfollowTeam: UnfollowTeamUseCase,
    private readonly listMyTeams: ListMyTeamsUseCase,
  ) {}

  public async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const sport = SUBCOMMAND_TO_SPORT[interaction.options.getSubcommand()];
    if (sport === undefined) {
      await interaction.respond([]);
      return;
    }

    const followed = await this.listMyTeams.execute({
      discordUserId: interaction.user.id,
      guildId: interaction.guildId,
    });

    const query = interaction.options.getFocused().toLowerCase();
    const choices = followed
      .filter(({ team }) => team.sport === sport)
      .filter(({ team }) => query === '' || team.name.toLowerCase().includes(query))
      .slice(0, 25)
      .map(({ team, subscription }) => ({
        name: team.name,
        // The value carries the subscription ID so the execute handler can delete the right row
        value: subscription.id.toString(),
      }));

    await interaction.respond(choices);
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (interaction.guildId === null) {
      await interaction.reply({
        embeds: [
          errorEmbed({
            title: 'Server-only command',
            description: 'Use `/unfollow` inside a server.',
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const rawId = interaction.options.getString(TEAM_OPTION, true);
    const subscriptionId = Number(rawId);
    if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) {
      await interaction.reply({
        embeds: [
          errorEmbed({
            title: 'Invalid selection',
            description: 'Please use the autocomplete list.',
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await this.unfollowTeam.execute({
      discordUserId: interaction.user.id,
      subscriptionId,
      guildId: interaction.guildId,
    });

    await interaction.editReply({
      embeds: [
        successEmbed({
          title: 'Team removed',
          description: `You are no longer following **${result.team.name}**. Notifications for this team will stop.`,
          thumbnailUrl: result.team.logoUrl,
        }),
      ],
    });
  }
}
