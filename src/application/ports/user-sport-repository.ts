import type { UserSport } from '@domain/entities/user-sport';
import type { Sport } from '@domain/value-objects/sport';

export interface IUserSportRepository {
  enable(userId: number, sport: Sport): Promise<UserSport>;
  disable(userId: number, sport: Sport): Promise<void>;
  isEnabled(userId: number, sport: Sport): Promise<boolean>;
  listByUser(userId: number): Promise<readonly UserSport[]>;
}
