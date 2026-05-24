export type NotificationKind = 'upcoming' | 'finished';

export interface NotificationSent {
  readonly id: number;
  readonly subscriptionId: number;
  readonly externalMatchId: string;
  readonly kind: NotificationKind;
  readonly sentAt: Date;
}

const KINDS: readonly NotificationKind[] = ['upcoming', 'finished'];

export function isNotificationKind(value: string): value is NotificationKind {
  return (KINDS as readonly string[]).includes(value);
}

export function assertNotificationKind(value: string): NotificationKind {
  if (!isNotificationKind(value)) {
    throw new Error(`Invalid notification kind: "${value}".`);
  }
  return value;
}
