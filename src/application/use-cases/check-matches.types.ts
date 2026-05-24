import type { NotificationKind } from '@domain/entities/notification-sent';
import type { Subscription } from '@domain/entities/subscription';
import type { Team } from '@domain/entities/team';

import type { ProviderMatch } from '@application/ports/sports-provider';

/** A pending notification ready to be delivered. */
export interface PendingNotification {
  readonly subscription: Subscription;
  readonly team: Team;
  readonly match: ProviderMatch;
  readonly kind: NotificationKind;
}
