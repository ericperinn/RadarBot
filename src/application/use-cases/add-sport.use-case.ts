import type { IUserRepository } from '@application/ports/user-repository';
import type { IUserSportRepository } from '@application/ports/user-sport-repository';
import type { Sport } from '@domain/value-objects/sport';

export interface AddSportInput {
  readonly discordUserId: string;
  readonly sport: Sport;
}

export interface AddSportResult {
  readonly userId: number;
  readonly sport: Sport;
  readonly alreadyEnabled: boolean;
}

export class AddSportUseCase {
  public constructor(
    private readonly users: IUserRepository,
    private readonly userSports: IUserSportRepository,
  ) {}

  public async execute(input: AddSportInput): Promise<AddSportResult> {
    const user = await this.users.upsertByDiscordId(input.discordUserId);
    const wasEnabled = await this.userSports.isEnabled(user.id, input.sport);
    await this.userSports.enable(user.id, input.sport);
    return {
      userId: user.id,
      sport: input.sport,
      alreadyEnabled: wasEnabled,
    };
  }
}
