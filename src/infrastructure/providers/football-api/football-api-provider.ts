import type { ISportsProvider, ProviderTeam } from '@application/ports/sports-provider';
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
  };
}

interface ApiSportsResponse {
  readonly errors: unknown;
  readonly response: readonly ApiSportsTeamRow[];
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
    };
  }
}
