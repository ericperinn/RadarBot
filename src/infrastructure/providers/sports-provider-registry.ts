import type { ISportsProvider } from '@application/ports/sports-provider';
import type { Sport } from '@domain/value-objects/sport';

export class SportsProviderRegistry {
  private readonly providers: ReadonlyMap<Sport, ISportsProvider>;

  public constructor(providers: readonly ISportsProvider[]) {
    const map = new Map<Sport, ISportsProvider>();
    for (const provider of providers) {
      if (map.has(provider.sport)) {
        throw new Error(`Duplicate provider registered for sport "${provider.sport}".`);
      }
      map.set(provider.sport, provider);
    }
    this.providers = map;
  }

  public get(sport: Sport): ISportsProvider {
    const provider = this.providers.get(sport);
    if (provider === undefined) {
      throw new Error(`No provider registered for sport "${sport}".`);
    }
    return provider;
  }

  public has(sport: Sport): boolean {
    return this.providers.has(sport);
  }

  public registeredSports(): readonly Sport[] {
    return Array.from(this.providers.keys());
  }
}
