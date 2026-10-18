import {
  ContentProviderType,
  NormalizedVideoMetadata,
  ProviderSearchParams,
  ProviderSearchResult,
  ProviderStatus,
} from '../types.js';

export abstract class BaseVideoProvider {
  abstract readonly providerType: ContentProviderType;
  abstract readonly name: string;
  abstract readonly isConfigured: boolean;

  protected rateLimitRemaining: number = 100;
  protected lastRequestTime: number = 0;
  protected minRequestIntervalMs: number = 200; // minimum ms between requests to avoid burst rate limit

  abstract search(params: ProviderSearchParams): Promise<ProviderSearchResult>;
  abstract checkAvailability(providerVideoId: string): Promise<boolean>;

  async getStatus(): Promise<ProviderStatus> {
    return {
      providerType: this.providerType,
      name: this.name,
      isEnabled: true,
      isConfigured: this.isConfigured,
      quotaUsed: 0,
      quotaLimit: 10000,
    };
  }

  protected async safeFetch<T>(
    url: string,
    options: RequestInit = {},
    retries = 2,
    timeoutMs = 10000
  ): Promise<T> {
    // Respect rate limit spacing
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestIntervalMs) {
      await new Promise((r) => setTimeout(r, this.minRequestIntervalMs - elapsed));
    }
    this.lastRequestTime = Date.now();

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'User-Agent': 'Vyntra-Discovery-Bot/1.0 (Watch. Connect. Discover; educational platform)',
            ...(options.headers || {}),
          },
        });
        clearTimeout(id);

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          if (response.status === 429) {
            throw new Error(`Rate limit exceeded (429) from ${this.name}: ${errText}`);
          }
          if (response.status >= 500 && attempt < retries) {
            // Server error from provider, retry with backoff
            await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
            continue;
          }
          throw new Error(`Provider ${this.name} HTTP ${response.status}: ${errText.slice(0, 300)}`);
        }

        return (await response.json()) as T;
      } catch (err: any) {
        clearTimeout(id);
        if (attempt === retries) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }

    throw new Error(`Provider ${this.name} request failed after retries`);
  }
}
