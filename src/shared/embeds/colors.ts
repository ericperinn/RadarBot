export const EMBED_COLORS = {
  success: 0x2ecc71,
  error: 0xe74c3c,
  info: 0x3498db,
  match: 0xe67e22,
} as const;

export type EmbedTheme = keyof typeof EMBED_COLORS;
