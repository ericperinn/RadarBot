import type { Sport } from '@domain/value-objects/sport';

/** Team data as returned by an external provider, before being persisted as a domain Team. */
export interface ProviderTeam {
  readonly externalId: string;
  readonly name: string;
  readonly logoUrl: string | null;
  /** Country/region label used only for autocomplete disambiguation — not stored in the DB. */
  readonly country?: string | null;
}

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export interface ProviderMatchOpponent {
  readonly name: string;
  readonly logoUrl: string | null;
}

export interface ProviderMatch {
  readonly externalId: string;
  readonly status: MatchStatus;
  readonly scheduledAt: Date;
  readonly finishedAt: Date | null;
  readonly opponent: ProviderMatchOpponent;
  /** Score of the followed team. */
  readonly scoreSelf: number | null;
  /** Score of the opponent. */
  readonly scoreOpponent: number | null;
  /** Tournament/league name when available (e.g. "ESL Pro League", "Brasileirão Série A"). */
  readonly competition: string | null;
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

  /** Upcoming matches for the given team within `withinMs` from now. */
  getUpcomingMatches(teamExternalId: string, withinMs: number): Promise<readonly ProviderMatch[]>;

  /** Matches that finished after `since` (exclusive). */
  getFinishedMatches(teamExternalId: string, since: Date): Promise<readonly ProviderMatch[]>;
}
