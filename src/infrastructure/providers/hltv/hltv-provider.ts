import { HLTV } from 'hltv';
import type { TeamRanking } from 'hltv';

import type { ISportsProvider, ProviderTeam } from '@application/ports/sports-provider';
import { ProviderUnavailableError } from '@domain/errors/provider-error';
import type { Sport } from '@domain/value-objects/sport';

import { InMemoryTtlCache } from '../cache/in-memory-ttl-cache';

const PROVIDER_NAME = 'HLTV';
const RANKING_CACHE_KEY = 'ranking';
const RANKING_TTL_MS = 60 * 60 * 1_000;
const DEFAULT_LIMIT = 25;

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

  public async searchTeams(
    query: string,
    limit: number = DEFAULT_LIMIT,
  ): Promise<readonly ProviderTeam[]> {
    const ranking = await this.getRanking();
    const normalized = query.trim().toLowerCase();
    if (normalized === '') {
      return ranking.slice(0, limit);
    }
    return ranking.filter((team) => team.name.toLowerCase().includes(normalized)).slice(0, limit);
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
}
