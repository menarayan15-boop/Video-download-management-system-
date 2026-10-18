import { BaseVideoProvider } from './base.provider.js';
import {
  ContentProviderType,
  NormalizedVideoMetadata,
  ProviderSearchParams,
  ProviderSearchResult,
  ProviderStatus,
} from '../types.js';

interface NasaImageCollectionItem {
  href: string;
  data: Array<{
    center?: string;
    title: string;
    nasa_id: string;
    date_created: string;
    keywords?: string[];
    media_type: string;
    description?: string;
    secondary_creator?: string;
  }>;
  links?: Array<{
    href: string;
    rel: string;
    render?: string;
  }>;
}

export class NasaProvider extends BaseVideoProvider {
  readonly providerType: ContentProviderType = 'NASA';
  readonly name = 'NASA Open Media & APIs';

  private cache: Map<string, { result: ProviderSearchResult; expiresAt: number }> = new Map();

  get isConfigured(): boolean {
    return Boolean(process.env.NASA_API_KEY && process.env.NASA_API_KEY.trim().length > 5);
  }

  private get apiKey(): string {
    return process.env.NASA_API_KEY || 'DEMO_KEY';
  }

  override async getStatus(): Promise<ProviderStatus> {
    return {
      providerType: this.providerType,
      name: this.name,
      isEnabled: true,
      isConfigured: this.isConfigured,
      quotaUsed: 0,
      quotaLimit: 5000,
    };
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const cacheKey = `${params.query}|${params.maxResults || 10}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    try {
      // NASA Images & Video Library API
      const searchUrl = new URL('https://images-api.nasa.gov/search');
      searchUrl.searchParams.set('q', params.query || 'space exploration');
      searchUrl.searchParams.set('media_type', 'video');
      searchUrl.searchParams.set('page_size', String(Math.min(params.maxResults || 10, 20)));

      const resp = await this.safeFetch<{
        collection?: {
          items?: NasaImageCollectionItem[];
          metadata?: { total_hits: number };
        };
      }>(searchUrl.toString(), {}, 2, 12000);

      const items = resp.collection?.items || [];
      const normalizedVideos: NormalizedVideoMetadata[] = [];

      for (const item of items) {
        const data = item.data?.[0];
        if (!data || !data.nasa_id) continue;

        // Find preview thumbnail
        const thumbLink = item.links?.find((l) => l.rel === 'preview' || l.render === 'image');
        const thumbnailUrl =
          thumbLink?.href ||
          `https://images-assets.nasa.gov/video/${encodeURIComponent(data.nasa_id)}/${encodeURIComponent(data.nasa_id)}~thumb.jpg`;

        // Direct mp4 video URL preview
        const directVideoUrl = `https://images-assets.nasa.gov/video/${encodeURIComponent(data.nasa_id)}/${encodeURIComponent(data.nasa_id)}~orig.mp4`;

        const center = data.center || 'NASA';
        const attribution = `Media courtesy of NASA / ${center}. Educational public domain space imagery and missions. Original source: NASA Images Library.`;

        normalizedVideos.push({
          provider: 'NASA',
          providerVideoId: data.nasa_id,
          title: data.title || 'NASA Mission Discovery',
          description: data.description || 'Official educational space mission coverage and imagery from NASA.',
          thumbnailUrl,
          playbackType: 'DIRECT',
          videoUrl: directVideoUrl,
          originalUrl: `https://images.nasa.gov/details/${encodeURIComponent(data.nasa_id)}`,
          durationSeconds: 180, // Default duration if not enumerated in index
          creatorName: `NASA (${center})`,
          creatorChannelUrl: 'https://images.nasa.gov',
          publishedAt: new Date(data.date_created || Date.now()),
          language: 'en',
          rightsStatus: 'PUBLIC_DOMAIN',
          licenseName: 'NASA Open Media (Public Domain / Educational)',
          attributionText: attribution,
          tags: ['NASA', 'Space', 'Astronomy', ...(data.keywords?.slice(0, 5) || [])],
          metadataJson: {
            nasaId: data.nasa_id,
            center: data.center,
            secondaryCreator: data.secondary_creator,
          },
        });
      }

      const result: ProviderSearchResult = {
        videos: normalizedVideos,
        totalResults: resp.collection?.metadata?.total_hits,
      };

      this.cache.set(cacheKey, {
        result,
        expiresAt: Date.now() + 60 * 60 * 1000,
      });

      return result;
    } catch (err: any) {
      console.error('[NasaProvider] Error fetching NASA videos:', err.message);
      return { videos: [] };
    }
  }

  async checkAvailability(providerVideoId: string): Promise<boolean> {
    try {
      const assetUrl = `https://images-api.nasa.gov/asset/${encodeURIComponent(providerVideoId)}`;
      const resp = await this.safeFetch<{ collection?: { items?: Array<{ href: string }> } }>(assetUrl);
      return Boolean(resp.collection?.items && resp.collection.items.length > 0);
    } catch {
      return false;
    }
  }
}
