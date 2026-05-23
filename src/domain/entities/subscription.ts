export interface Subscription {
  readonly id: number;
  readonly userId: number;
  readonly teamId: number;
  readonly guildId: string;
  readonly channelId: string;
  readonly createdAt: Date;
}
