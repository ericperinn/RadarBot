interface CacheEntry<V> {
  readonly value: V;
  readonly expiresAt: number;
}

export class InMemoryTtlCache<K, V> {
  private readonly store = new Map<K, CacheEntry<V>>();

  public constructor(private readonly ttlMs: number) {}

  public get(key: K): V | null {
    const entry = this.store.get(key);
    if (entry === undefined) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  public set(key: K, value: V): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  public clear(): void {
    this.store.clear();
  }
}
