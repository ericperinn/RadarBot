import type { Sport } from '@domain/value-objects/sport';

export interface UserSport {
  readonly userId: number;
  readonly sport: Sport;
  readonly enabledAt: Date;
}
