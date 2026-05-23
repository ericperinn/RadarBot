import type { Sport } from '@domain/value-objects/sport';

/** Team data as returned by an external provider, before being persisted as a domain Team. */
export interface ProviderTeam {
  readonly externalId: string;
  readonly name: string;
  readonly logoUrl: string | null;
}

export interface ISportsProvider {
  readonly sport: Sport;

  /**
   * Searches teams by free-text query. Used by the Discord autocomplete handler.
   * Implementations SHOULD return at most `limit` results (default 25 — Discord's cap).
   */
  searchTeams(query: string, limit?: number): Promise<readonly ProviderTeam[]>;

  /** Resolves a team by the provider's external id. Returns null when not found. */
  findTeamByExternalId(externalId: string): Promise<ProviderTeam | null>;
}
