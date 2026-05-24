import type {
  ISportsProvider,
  ProviderMatch,
  ProviderTeam,
} from '@application/ports/sports-provider';
import type { Sport } from '@domain/value-objects/sport';

import { InMemoryTtlCache } from './in-memory-ttl-cache';

const DEFAULT_TTL_MS = 30_000;

export class CachedSportsProvider implements ISportsProvider {
  public readonly sport: Sport;
  private readonly cache: InMemoryTtlCache<string, readonly ProviderTeam[]>;

  public constructor(
    private readonly inner: ISportsProvider,
    ttlMs: number = DEFAULT_TTL_MS,
  ) {
    this.sport = inner.sport;
    this.cache = new InMemoryTtlCache<string, readonly ProviderTeam[]>(ttlMs);
  }

  public async searchTeams(query: string, limit?: number): Promise<readonly ProviderTeam[]> {
    const key = this.buildKey(query, limit);
    const cached = this.cache.get(key);
    if (cached !== null) {
      return cached;
    }
    const result = await this.inner.searchTeams(query, limit);
    this.cache.set(key, result);
    return result;
  }

  public findTeamByExternalId(externalId: string): Promise<ProviderTeam | null> {
    return this.inner.findTeamByExternalId(externalId);
  }

  public getUpcomingMatches(
    teamExternalId: string,
    withinMs: number,
  ): Promise<readonly ProviderMatch[]> {
    return this.inner.getUpcomingMatches(teamExternalId, withinMs);
  }

  public getFinishedMatches(
    teamExternalId: string,
    since: Date,
  ): Promise<readonly ProviderMatch[]> {
    return this.inner.getFinishedMatches(teamExternalId, since);
  }

  private buildKey(query: string, limit: number | undefined): string {
    const normalizedLimit = limit === undefined ? 'default' : limit.toString();
    return `${query.trim().toLowerCase()}::${normalizedLimit}`;
  }
}
