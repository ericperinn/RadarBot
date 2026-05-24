import type { EmbedBuilder } from 'discord.js';

import type { ProviderMatch } from '@application/ports/sports-provider';
import type { Team } from '@domain/entities/team';

import { matchEmbed } from './embed-factory';

export function upcomingMatchEmbed(team: Team, match: ProviderMatch): EmbedBuilder {
  const competition = match.competition === null ? '' : ` _(${match.competition})_`;
  const unixSeconds = Math.floor(match.scheduledAt.getTime() / 1000).toString();
  const description = [
    `**${team.name}** vs **${match.opponent.name}**${competition}`,
    `🕒 <t:${unixSeconds}:F> — <t:${unixSeconds}:R>`,
  ].join('\n');
  return matchEmbed({
    title: 'Upcoming match',
    description,
    thumbnailUrl: team.logoUrl,
  });
}

export function finishedMatchEmbed(team: Team, match: ProviderMatch): EmbedBuilder {
  const competition = match.competition === null ? '' : ` _(${match.competition})_`;
  const score =
    match.scoreSelf === null || match.scoreOpponent === null
      ? '—'
      : `${match.scoreSelf.toString()} x ${match.scoreOpponent.toString()}`;
  const description = [`**${team.name}** ${score} **${match.opponent.name}**${competition}`].join(
    '\n',
  );
  return matchEmbed({
    title: 'Match result',
    description,
    thumbnailUrl: team.logoUrl,
  });
}
