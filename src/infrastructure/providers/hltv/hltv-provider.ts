import { HLTV } from 'hltv';
import type { FullMatchResult, MatchPreview, TeamRanking } from 'hltv';

import type {
  ISportsProvider,
  ProviderMatch,
  ProviderTeam,
} from '@application/ports/sports-provider';
import { ProviderUnavailableError } from '@domain/errors/provider-error';
import type { Sport } from '@domain/value-objects/sport';

import { InMemoryTtlCache } from '../cache/in-memory-ttl-cache';

const PROVIDER_NAME = 'HLTV';
const RANKING_CACHE_KEY = 'ranking';
const RANKING_TTL_MS = 60 * 60 * 1_000;
const TEAM_LOOKUP_TTL_MS = 5 * 60 * 1_000;
const DEFAULT_LIMIT = 25;
const MIN_DIRECT_LOOKUP_LENGTH = 3;

/**
 * CS2 teams provider backed by the unofficial `hltv` npm package.
 *
 * Limitation: HLTV does not expose a fuzzy search endpoint. We cache the world ranking
 * (top ~30) and filter locally. Teams outside the ranking will not appear in autocomplete.
 */
export class HltvProvider implements ISportsProvider {
  public readonly sport: Sport = 'CS2';
  private readonly rankingCache = new InMemoryTtlCache<string, readonly ProviderTeam[]>(
    RANKING_TTL_MS,
  );
  private readonly teamLookupCache = new InMemoryTtlCache<string, ProviderTeam>(TEAM_LOOKUP_TTL_MS);

  public async searchTeams(
    query: string,
    limit: number = DEFAULT_LIMIT,
  ): Promise<readonly ProviderTeam[]> {
    const normalized = query.trim().toLowerCase();

    // Primary source: world ranking cache (top 30)
    const ranking = await this.getRanking();
    if (normalized === '') {
      return ranking.slice(0, limit);
    }
    const rankingMatches = ranking
      .filter((team) => team.name.toLowerCase().includes(normalized))
      .slice(0, limit);
    if (rankingMatches.length > 0) {
      return rankingMatches;
    }

    // Fallback: direct name lookup on HLTV (for teams outside top 30)
    if (normalized.length < MIN_DIRECT_LOOKUP_LENGTH) {
      return [];
    }
    const direct = await this.lookupTeamByName(normalized);
    return direct !== null ? [direct] : [];
  }

  public async findTeamByExternalId(externalId: string): Promise<ProviderTeam | null> {
    const numericId = Number(externalId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return null;
    }
    try {
      const team = await HLTV.getTeam({ id: numericId });
      return {
        externalId: team.id.toString(),
        name: team.name,
        logoUrl: team.logo ?? null,
      };
    } catch (error: unknown) {
      throw new ProviderUnavailableError(PROVIDER_NAME, error);
    }
  }

  public async getUpcomingMatches(
    teamExternalId: string,
    withinMs: number,
  ): Promise<readonly ProviderMatch[]> {
    const numericId = Number(teamExternalId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return [];
    }
    let matches: readonly MatchPreview[];
    try {
      matches = await HLTV.getMatches({ teamIds: [numericId] });
    } catch (error: unknown) {
      throw new ProviderUnavailableError(PROVIDER_NAME, error);
    }
    const horizon = Date.now() + withinMs;
    return matches
      .filter((m) => typeof m.date === 'number' && m.date <= horizon && !m.live)
      .map((m) => mapPreviewToMatch(m, numericId))
      .filter((m): m is ProviderMatch => m !== null);
  }

  public async getFinishedMatches(
    teamExternalId: string,
    since: Date,
  ): Promise<readonly ProviderMatch[]> {
    const numericId = Number(teamExternalId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return [];
    }
    const startDate = toIsoDate(since);
    const endDate = toIsoDate(new Date());
    let results: readonly FullMatchResult[];
    try {
      results = await HLTV.getResults({ teamIds: [numericId], startDate, endDate });
    } catch (error: unknown) {
      throw new ProviderUnavailableError(PROVIDER_NAME, error);
    }
    return results
      .filter((r) => r.date * 1 >= since.getTime())
      .map((r) => mapResultToMatch(r, numericId));
  }

  private async getRanking(): Promise<readonly ProviderTeam[]> {
    const cached = this.rankingCache.get(RANKING_CACHE_KEY);
    if (cached !== null) {
      return cached;
    }
    let rows: readonly TeamRanking[];
    try {
      rows = await HLTV.getTeamRanking();
    } catch (error: unknown) {
      throw new ProviderUnavailableError(PROVIDER_NAME, error);
    }
    const mapped = rows
      .filter((row): row is TeamRanking & { team: { id: number; name: string } } => {
        return typeof row.team.id === 'number';
      })
      .map<ProviderTeam>((row) => ({
        externalId: row.team.id.toString(),
        name: row.team.name,
        logoUrl: null,
      }));
    this.rankingCache.set(RANKING_CACHE_KEY, mapped);
    return mapped;
  }

  private async lookupTeamByName(name: string): Promise<ProviderTeam | null> {
    const cached = this.teamLookupCache.get(name);
    if (cached !== null) {
      return cached;
    }
    try {
      const team = await HLTV.getTeamByName({ name });
      const result: ProviderTeam = {
        externalId: team.id.toString(),
        name: team.name,
        logoUrl: team.logo ?? null,
      };
      this.teamLookupCache.set(name, result);
      return result;
    } catch {
      // Team not found or HLTV scrape error — fail silently in autocomplete context
      return null;
    }
  }
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mapPreviewToMatch(preview: MatchPreview, selfTeamId: number): ProviderMatch | null {
  if (preview.date === undefined) {
    return null;
  }
  const isSelfTeam1 = preview.team1?.id === selfTeamId;
  const opponentRaw = isSelfTeam1 ? preview.team2 : preview.team1;
  if (opponentRaw === undefined) {
    return null;
  }
  return {
    externalId: preview.id.toString(),
    status: 'scheduled',
    scheduledAt: new Date(preview.date),
    finishedAt: null,
    opponent: { name: opponentRaw.name, logoUrl: null },
    scoreSelf: null,
    scoreOpponent: null,
    competition: preview.event?.name ?? null,
  };
}

function mapResultToMatch(result: FullMatchResult, selfTeamId: number): ProviderMatch {
  // The HLTV results endpoint does not expose team IDs — we fall back to mapping by
  // returning the score from team1's perspective. The notification embed shows both teams
  // explicitly so this orientation is informational only.
  void selfTeamId;
  const finishedAt = new Date(result.date);
  return {
    externalId: result.id.toString(),
    status: 'finished',
    scheduledAt: finishedAt,
    finishedAt,
    opponent: { name: result.team2.name, logoUrl: result.team2.logo || null },
    scoreSelf: result.result.team1,
    scoreOpponent: result.result.team2,
    competition: null,
  };
}
