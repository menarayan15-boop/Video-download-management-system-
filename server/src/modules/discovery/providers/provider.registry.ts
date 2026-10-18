import { BaseVideoProvider } from './base.provider.js';
import { YouTubeProvider } from './youtube.provider.js';
import { NasaProvider } from './nasa.provider.js';
import { ArchiveProvider } from './archive.provider.js';
import { ContentProviderType, ProviderStatus } from '../types.js';

export class ProviderRegistry {
  private providers: Map<ContentProviderType, BaseVideoProvider> = new Map();

  constructor() {
    this.register(new YouTubeProvider());
    this.register(new NasaProvider());
    this.register(new ArchiveProvider());
  }

  register(provider: BaseVideoProvider): void {
    this.providers.set(provider.providerType, provider);
  }

  get(type: ContentProviderType): BaseVideoProvider | undefined {
    return this.providers.get(type);
  }

  getAll(): BaseVideoProvider[] {
    return Array.from(this.providers.values());
  }

  async getAllStatuses(): Promise<ProviderStatus[]> {
    return Promise.all(this.getAll().map((p) => p.getStatus()));
  }
}

export const providerRegistry = new ProviderRegistry();
