import type { Team } from '@domain/entities/team';
import type { Sport } from '@domain/value-objects/sport';

export interface TeamUpsertInput {
  readonly sport: Sport;
  readonly externalId: string;
  readonly name: string;
  readonly logoUrl: string | null;
}

export interface ITeamRepository {
  findById(id: number): Promise<Team | null>;
  findBySportAndExternalId(sport: Sport, externalId: string): Promise<Team | null>;
  /** Inserts or updates by (sport, externalId). Returns the persisted entity. */
  upsert(input: TeamUpsertInput): Promise<Team>;
}
