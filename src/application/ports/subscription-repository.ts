import type { Subscription } from '@domain/entities/subscription';

export interface SubscriptionCreateInput {
  readonly userId: number;
  readonly teamId: number;
  readonly guildId: string;
  readonly channelId: string;
}

export interface ISubscriptionRepository {
  create(input: SubscriptionCreateInput): Promise<Subscription>;
  delete(id: number): Promise<void>;
  findById(id: number): Promise<Subscription | null>;
  findByUser(userId: number): Promise<readonly Subscription[]>;
  findByTeam(teamId: number): Promise<readonly Subscription[]>;
  exists(userId: number, teamId: number, guildId: string): Promise<boolean>;
  /** Lists every active subscription — used by the background worker. */
  listActive(): Promise<readonly Subscription[]>;
  deactivate(id: number): Promise<void>;
}
