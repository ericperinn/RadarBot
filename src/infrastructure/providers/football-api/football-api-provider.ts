import type {
  ISportsProvider,
  MatchStatus,
  ProviderMatch,
  ProviderTeam,
} from '@application/ports/sports-provider';
import { ProviderError, ProviderUnavailableError } from '@domain/errors/provider-error';
import type { Sport } from '@domain/value-objects/sport';

import { httpGetJson } from '../http/http-client';

const PROVIDER_NAME = 'API-Sports/Football';
const BASE_URL = 'https://v3.football.api-sports.io';
const DEFAULT_LIMIT = 25;
const MIN_QUERY_LENGTH = 3;

interface ApiSportsTeamRow {
  readonly team: {
    readonly id: number;
    readonly name: string;
    readonly logo: string | null;
    readonly country: string | null;
  };
}

interface ApiSportsResponse {
  readonly errors: unknown;
  readonly response: readonly ApiSportsTeamRow[];
}

interface ApiSportsFixtureRow {
  readonly fixture: {
    readonly id: number;
    readonly date: string;
    readonly status: { readonly short: string };
  };
  readonly league: { readonly name: string } | null;
  readonly teams: {
    readonly home: { readonly id: number; readonly name: string; readonly logo: string | null };
    readonly away: { readonly id: number; readonly name: string; readonly logo: string | null };
  };
  readonly goals: { readonly home: number | null; readonly away: number | null };
}

interface ApiSportsFixturesResponse {
  readonly errors: unknown;
  readonly response: readonly ApiSportsFixtureRow[];
}

export interface FootballApiProviderOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
}

function hasErrors(errors: unknown): boolean {
  if (Array.isArray(errors)) {
    return errors.length > 0;
  }
  if (errors !== null && typeof errors === 'object') {
    return Object.keys(errors).length > 0;
  }
  return false;
}

export class FootballApiProvider implements ISportsProvider {
  public readonly sport: Sport = 'FOOTBALL';
  private readonly apiKey: string;
  private readonly baseUrl: string;

  public constructor(options: FootballApiProviderOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? BASE_URL;
  }

  public async searchTeams(
    query: string,
    limit: number = DEFAULT_LIMIT,
  ): Promise<readonly ProviderTeam[]> {
    const normalized = query.trim();
    if (normalized.length < MIN_QUERY_LENGTH) {
      return [];
    }

    const url = `${this.baseUrl}/teams?search=${encodeURIComponent(normalized)}`;
    const { data } = await httpGetJson<ApiSportsResponse>(PROVIDER_NAME, url, {
      headers: { 'x-apisports-key': this.apiKey },
    });

    if (hasErrors(data.errors)) {
      throw new ProviderError(PROVIDER_NAME, `API returned errors: ${JSON.stringify(data.errors)}`);
    }
    const rows = data.response;
    if (!Array.isArray(rows)) {
      throw new ProviderUnavailableError(PROVIDER_NAME, 'Malformed response payload.');
    }

    const typedRows: readonly ApiSportsTeamRow[] = rows;
    return typedRows.slice(0, limit).map<ProviderTeam>((row) => ({
      externalId: row.team.id.toString(),
      name: row.team.name,
      logoUrl: row.team.logo,
      country: row.team.country,
    }));
  }

  public async findTeamByExternalId(externalId: string): Promise<ProviderTeam | null> {
    const numericId = Number(externalId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return null;
    }
    const url = `${this.baseUrl}/teams?id=${numericId.toString()}`;
    const { data } = await httpGetJson<ApiSportsResponse>(PROVIDER_NAME, url, {
      headers: { 'x-apisports-key': this.apiKey },
    });
    if (hasErrors(data.errors)) {
      throw new ProviderError(PROVIDER_NAME, `API returned errors: ${JSON.stringify(data.errors)}`);
    }
    const rows = data.response;
    if (!Array.isArray(rows)) {
      throw new ProviderUnavailableError(PROVIDER_NAME, 'Malformed response payload.');
    }
    const typedRows: readonly ApiSportsTeamRow[] = rows;
    const row = typedRows[0];
    if (row === undefined) {
      return null;
    }
    return {
      externalId: row.team.id.toString(),
      name: row.team.name,
      logoUrl: row.team.logo,
      country: row.team.country,
    };
  }

  public async getUpcomingMatches(
    teamExternalId: string,
    withinMs: number,
  ): Promise<readonly ProviderMatch[]> {
    const fixtures = await this.fetchFixtures(teamExternalId, 'next=20');
    const numericId = Number(teamExternalId);
    const horizon = Date.now() + withinMs;
    return fixtures
      .filter((row) => mapFixtureStatus(row.fixture.status.short) === 'scheduled')
      .map((row) => mapFixtureToMatch(row, numericId))
      .filter((m): m is ProviderMatch => m !== null && m.scheduledAt.getTime() <= horizon);
  }

  public async getFinishedMatches(
    teamExternalId: string,
    since: Date,
  ): Promise<readonly ProviderMatch[]> {
    const fixtures = await this.fetchFixtures(teamExternalId, 'last=20');
    const numericId = Number(teamExternalId);
    return fixtures
      .filter((row) => mapFixtureStatus(row.fixture.status.short) === 'finished')
      .map((row) => mapFixtureToMatch(row, numericId))
      .filter((m): m is ProviderMatch => m !== null && m.scheduledAt.getTime() >= since.getTime());
  }

  private async fetchFixtures(
    teamExternalId: string,
    qualifier: string,
  ): Promise<readonly ApiSportsFixtureRow[]> {
    const numericId = Number(teamExternalId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return [];
    }
    const url = `${this.baseUrl}/fixtures?team=${numericId.toString()}&${qualifier}`;
    const { data } = await httpGetJson<ApiSportsFixturesResponse>(PROVIDER_NAME, url, {
      headers: { 'x-apisports-key': this.apiKey },
    });
    if (hasErrors(data.errors)) {
      throw new ProviderError(PROVIDER_NAME, `API returned errors: ${JSON.stringify(data.errors)}`);
    }
    const rows = data.response;
    if (!Array.isArray(rows)) {
      throw new ProviderUnavailableError(PROVIDER_NAME, 'Malformed response payload.');
    }
    const typedRows: readonly ApiSportsFixtureRow[] = rows;
    return typedRows;
  }
}

const FINISHED_STATUS = new Set(['FT', 'AET', 'PEN']);
const LIVE_STATUS = new Set(['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE']);

function mapFixtureStatus(short: string): MatchStatus {
  if (FINISHED_STATUS.has(short)) {
    return 'finished';
  }
  if (LIVE_STATUS.has(short)) {
    return 'live';
  }
  return 'scheduled';
}

function mapFixtureToMatch(row: ApiSportsFixtureRow, selfTeamId: number): ProviderMatch | null {
  const isSelfHome = row.teams.home.id === selfTeamId;
  if (!isSelfHome && row.teams.away.id !== selfTeamId) {
    return null;
  }
  const opponent = isSelfHome ? row.teams.away : row.teams.home;
  const scheduledAt = new Date(row.fixture.date);
  if (Number.isNaN(scheduledAt.getTime())) {
    return null;
  }
  const status = mapFixtureStatus(row.fixture.status.short);
  const scoreSelf = isSelfHome ? row.goals.home : row.goals.away;
  const scoreOpponent = isSelfHome ? row.goals.away : row.goals.home;
  return {
    externalId: row.fixture.id.toString(),
    status,
    scheduledAt,
    finishedAt: status === 'finished' ? scheduledAt : null,
    opponent: { name: opponent.name, logoUrl: opponent.logo },
    scoreSelf,
    scoreOpponent,
    competition: row.league?.name ?? null,
  };
}
