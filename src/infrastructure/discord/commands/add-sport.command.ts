import { type ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';

import type { AddSportUseCase } from '@application/use-cases/add-sport.use-case';
import { assertSport, SPORTS } from '@domain/value-objects/sport';
import { infoEmbed, successEmbed } from '@shared/embeds/embed-factory';

import type { Command } from './command';

const SPORT_LABELS: Readonly<Record<(typeof SPORTS)[number], string>> = {
  CS2: 'CS2 (HLTV)',
  FOOTBALL: 'Futebol (API-Sports)',
};

export class AddSportCommand implements Command {
  public readonly data = new SlashCommandBuilder()
    .setName('add_sport')
    .setDescription('Habilita um ecossistema esportivo para você seguir times.')
    .addStringOption((opt) =>
      opt
        .setName('sport')
        .setDescription('Escolha o esporte que deseja habilitar')
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
          title: 'Esporte já estava habilitado',
          description: `${SPORT_LABELS[sport]} já constava nas suas preferências.`,
        })
      : successEmbed({
          title: 'Esporte habilitado',
          description: `Você agora pode usar \`/follow\` para acompanhar times de **${SPORT_LABELS[sport]}**.`,
        });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}
