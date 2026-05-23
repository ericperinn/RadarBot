import type { PrismaClient } from '@prisma/client';

import type { ITeamRepository, TeamUpsertInput } from '@application/ports/team-repository';
import type { Team } from '@domain/entities/team';
import type { Sport } from '@domain/value-objects/sport';

import { toTeam } from './mappers';

export class PrismaTeamRepository implements ITeamRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: number): Promise<Team | null> {
    const row = await this.prisma.team.findUnique({ where: { id } });
    return row === null ? null : toTeam(row);
  }

  public async findBySportAndExternalId(sport: Sport, externalId: string): Promise<Team | null> {
    const row = await this.prisma.team.findUnique({
      where: { sport_externalId: { sport, externalId } },
    });
    return row === null ? null : toTeam(row);
  }

  public async upsert(input: TeamUpsertInput): Promise<Team> {
    const row = await this.prisma.team.upsert({
      where: { sport_externalId: { sport: input.sport, externalId: input.externalId } },
      create: {
        sport: input.sport,
        externalId: input.externalId,
        name: input.name,
        logoUrl: input.logoUrl,
      },
      update: {
        name: input.name,
        logoUrl: input.logoUrl,
      },
    });
    return toTeam(row);
  }
}
