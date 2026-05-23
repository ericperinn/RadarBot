import type { Sport } from '@domain/value-objects/sport';

export interface Team {
  readonly id: number;
  readonly sport: Sport;
  readonly externalId: string;
  readonly name: string;
  readonly logoUrl: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
