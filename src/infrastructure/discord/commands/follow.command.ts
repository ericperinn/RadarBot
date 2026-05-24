import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import type { FollowTeamUseCase } from '@application/use-cases/follow-team.use-case';
import { type Sport } from '@domain/value-objects/sport';
import { errorEmbed, infoEmbed, successEmbed } from '@shared/embeds/embed-factory';

import type { SportsProviderRegistry } from '@infrastructure/providers/sports-provider-registry';

import type { Command } from './command';

const SUBCOMMAND_TO_SPORT: Readonly<Record<string, Sport>> = {
  cs2: 'CS2',
  football: 'FOOTBALL',
};

const TEAM_OPTION = 'team';
const AUTOCOMPLETE_LIMIT = 25;

export class FollowCommand implements Command {
  public readonly data = new SlashCommandBuilder()
    .setName('follow')
    .setDescription('Follow a team to receive match notifications.')
    .addSubcommand((sub) =>
      sub
        .setName('cs2')
        .setDescription('Follow a CS2 team')
        .addStringOption((opt) =>
          opt
            .setName(TEAM_OPTION)
            .setDescription('Team name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('football')
        .setDescription('Follow a football team')
        .addStringOption((opt) =>
          opt
            .setName(TEAM_OPTION)
            .setDescription('Team name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    );

  public constructor(
    private readonly followTeam: FollowTeamUseCase,
    private readonly providers: SportsProviderRegistry,
  ) {}

  public async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const sport = SUBCOMMAND_TO_SPORT[interaction.options.getSubcommand()];
    if (sport === undefined) {
      await interaction.respond([]);
      return;
    }
    const focused = interaction.options.getFocused(true);
    if (focused.name !== TEAM_OPTION) {
      await interaction.respond([]);
      return;
    }
    const provider = this.providers.get(sport);
    const teams = await provider.searchTeams(focused.value, AUTOCOMPLETE_LIMIT);
    await interaction.respond(
      teams.map((t) => ({
        name: truncate(t.name, 100),
        value: t.externalId,
      })),
    );
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (interaction.guildId === null) {
      await interaction.reply({
        embeds: [
          errorEmbed({
            title: 'Server-only command',
            description: 'Use `/follow` inside a server to receive alerts in a channel.',
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const sport = SUBCOMMAND_TO_SPORT[subcommand];
    if (sport === undefined) {
      await interaction.reply({
        embeds: [errorEmbed({ title: 'Unknown sport', description: subcommand })],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const externalTeamId = interaction.options.getString(TEAM_OPTION, true);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await this.followTeam.execute({
      discordUserId: interaction.user.id,
      sport,
      externalTeamId,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
    });

    const embed = result.alreadyFollowed
      ? infoEmbed({
          title: 'Already following',
          description: `**${result.team.name}** is already in your list for this server.`,
          thumbnailUrl: result.team.logoUrl,
        })
      : successEmbed({
          title: 'Team added',
          description: `You are now following **${result.team.name}**. Notifications will be sent to this channel.`,
          thumbnailUrl: result.team.logoUrl,
        });

    await interaction.editReply({ embeds: [embed] });
  }
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
