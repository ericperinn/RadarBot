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
    .setDescription('Seguir um time para receber notificações de partidas.')
    .addSubcommand((sub) =>
      sub
        .setName('cs2')
        .setDescription('Seguir um time de CS2')
        .addStringOption((opt) =>
          opt
            .setName(TEAM_OPTION)
            .setDescription('Nome do time')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('football')
        .setDescription('Seguir um time de futebol')
        .addStringOption((opt) =>
          opt
            .setName(TEAM_OPTION)
            .setDescription('Nome do time')
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
            title: 'Comando disponível apenas em servidores',
            description: 'Use `/follow` dentro de um servidor para receber alertas no canal.',
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
        embeds: [errorEmbed({ title: 'Esporte desconhecido', description: subcommand })],
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
          title: 'Você já segue este time',
          description: `**${result.team.name}** já estava na sua lista neste servidor.`,
          thumbnailUrl: result.team.logoUrl,
        })
      : successEmbed({
          title: 'Time adicionado',
          description: `Você agora segue **${result.team.name}**. Notificações chegarão neste canal.`,
          thumbnailUrl: result.team.logoUrl,
        });

    await interaction.editReply({ embeds: [embed] });
  }
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
