export const SPORTS = ['CS2', 'FOOTBALL'] as const;

export type Sport = (typeof SPORTS)[number];

export function isSport(value: string): value is Sport {
  return (SPORTS as readonly string[]).includes(value);
}

export function assertSport(value: string): Sport {
  if (!isSport(value)) {
    throw new Error(`Invalid sport value: "${value}". Expected one of: ${SPORTS.join(', ')}.`);
  }
  return value;
}
