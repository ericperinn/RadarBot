import type { User } from '@domain/entities/user';

export interface IUserRepository {
  findByDiscordId(discordId: string): Promise<User | null>;
  /** Creates the user if absent; otherwise returns the existing record. Idempotent. */
  upsertByDiscordId(discordId: string): Promise<User>;
}
