export abstract class DomainError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class SubscriptionAlreadyExistsError extends DomainError {
  public constructor(userId: number, teamId: number, guildId: string) {
    super(
      `Subscription already exists for user=${userId.toString()} team=${teamId.toString()} guild=${guildId}.`,
    );
  }
}

export class SportNotEnabledError extends DomainError {
  public constructor(sport: string) {
    super(`User has not enabled sport "${sport}". Use /add_sport first.`);
  }
}
