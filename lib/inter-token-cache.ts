export interface InterOAuthToken {
  token: string;
  expiresInSeconds: number;
}

interface CachedToken {
  token: string;
  validUntil: number;
}

/**
 * Reutiliza tokens OAuth e consolida renovações concorrentes no mesmo processo.
 * O token deixa de ser usado antes do vencimento para absorver latência e clock skew.
 */
export class InterTokenCache {
  private readonly tokens = new Map<string, CachedToken>();
  private readonly pending = new Map<string, Promise<InterOAuthToken>>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly safetyWindowMs = 60_000,
  ) {}

  async get(key: string, load: () => Promise<InterOAuthToken>): Promise<string> {
    const cached = this.tokens.get(key);
    if (cached && cached.validUntil > this.now()) return cached.token;

    const existingRequest = this.pending.get(key);
    if (existingRequest) return (await existingRequest).token;

    const request = load();
    this.pending.set(key, request);

    try {
      const result = await request;
      const ttlMs = Math.max(1_000, result.expiresInSeconds * 1_000 - this.safetyWindowMs);
      this.tokens.set(key, {
        token: result.token,
        validUntil: this.now() + ttlMs,
      });
      return result.token;
    } finally {
      this.pending.delete(key);
    }
  }
}

export const interTokenCache = new InterTokenCache();
