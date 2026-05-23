import { EmbedBuilder } from 'discord.js';

import { EMBED_COLORS, type EmbedTheme } from './colors';

export interface EmbedInput {
  readonly title: string;
  readonly description?: string;
  readonly thumbnailUrl?: string | null;
  readonly footer?: string;
}

function build(theme: EmbedTheme, input: EmbedInput): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(EMBED_COLORS[theme]).setTitle(input.title);
  if (input.description !== undefined) {
    embed.setDescription(input.description);
  }
  if (
    input.thumbnailUrl !== undefined &&
    input.thumbnailUrl !== null &&
    input.thumbnailUrl !== ''
  ) {
    embed.setThumbnail(input.thumbnailUrl);
  }
  if (input.footer !== undefined) {
    embed.setFooter({ text: input.footer });
  }
  return embed;
}

export function successEmbed(input: EmbedInput): EmbedBuilder {
  return build('success', input);
}

export function errorEmbed(input: EmbedInput): EmbedBuilder {
  return build('error', input);
}

export function infoEmbed(input: EmbedInput): EmbedBuilder {
  return build('info', input);
}

export function matchEmbed(input: EmbedInput): EmbedBuilder {
  return build('match', input);
}
