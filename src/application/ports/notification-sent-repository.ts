import type { NotificationKind, NotificationSent } from '@domain/entities/notification-sent';

export interface NotificationSentRecordInput {
  readonly subscriptionId: number;
  readonly externalMatchId: string;
  readonly kind: NotificationKind;
}

export interface INotificationSentRepository {
  /** Returns true when (sub, match, kind) is already registered. */
  exists(input: NotificationSentRecordInput): Promise<boolean>;
  /** Atomically inserts the record. Returns null when the entry already existed. */
  recordOnce(input: NotificationSentRecordInput): Promise<NotificationSent | null>;
}
