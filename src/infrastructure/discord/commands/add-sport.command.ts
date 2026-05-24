import { type ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';

import type { AddSportUseCase } from '@application/use-cases/add-sport.use-case';
import { assertSport, SPORTS } from '@domain/value-objects/sport';
import { infoEmbed, successEmbed } from '@shared/embeds/embed-factory';

import type { Command } from './command';

const SPORT_LABELS: Readonly<Record<(typeof SPORTS)[number], string>> = {
  CS2: 'CS2 (HLTV)',
  FOOTBALL: 'Football (API-Sports)',
};

export class AddSportCommand implements Command {
  public readonly data = new SlashCommandBuilder()
    .setName('add_sport')
    .setDescription('Enables a sport so you can follow teams and receive match notifications.')
    .addStringOption((opt) =>
      opt
        .setName('sport')
        .setDescription('Sport to enable')
        .setRequired(true)
        .addChoices(...SPORTS.map((sport) => ({ name: SPORT_LABELS[sport], value: sport }))),
    );

  public constructor(private readonly addSport: AddSportUseCase) {}

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const rawSport = interaction.options.getString('sport', true);
    const sport = assertSport(rawSport);

    const result = await this.addSport.execute({
      discordUserId: interaction.user.id,
      sport,
    });

    const embed = result.alreadyEnabled
      ? infoEmbed({
          title: 'Sport already enabled',
          description: `${SPORT_LABELS[sport]} was already in your preferences.`,
        })
      : successEmbed({
          title: 'Sport enabled',
          description: `You can now use \`/follow\` to track **${SPORT_LABELS[sport]}** teams.`,
        });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}
