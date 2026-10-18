import { BaseVideoProvider } from './base.provider.js';
import {
  ContentProviderType,
  NormalizedVideoMetadata,
  ProviderSearchParams,
  ProviderSearchResult,
  ProviderStatus,
} from '../types.js';

interface YouTubeSearchItem {
  id: {
    kind: string;
    videoId?: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
      maxres?: { url: string };
    };
    channelTitle: string;
    liveBroadcastContent?: string;
  };
}

interface YouTubeVideoDetailsItem {
  id: string;
  contentDetails?: {
    duration?: string;
    definition?: string;
    licensedContent?: boolean;
    regionRestriction?: {
      blocked?: string[];
      allowed?: string[];
    };
  };
  status?: {
    uploadStatus?: string;
    privacyStatus?: string;
    embeddable?: boolean;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
  };
}

export class YouTubeProvider extends BaseVideoProvider {
  readonly providerType: ContentProviderType = 'YOUTUBE';
  readonly name = 'YouTube Data API v3';

  private cache: Map<string, { result: ProviderSearchResult; expiresAt: number }> = new Map();
  private dailyQuotaEstimatedUsed = 0;
  private readonly dailyQuotaLimit = 10000;

  get isConfigured(): boolean {
    return Boolean(process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY.trim().length > 5);
  }

  private get apiKey(): string {
    return process.env.YOUTUBE_API_KEY || '';
  }

  override async getStatus(): Promise<ProviderStatus> {
    return {
      providerType: this.providerType,
      name: this.name,
      isEnabled: true,
      isConfigured: this.isConfigured,
      quotaUsed: this.dailyQuotaEstimatedUsed,
      quotaLimit: this.dailyQuotaLimit,
    };
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    if (!this.isConfigured) {
      console.warn('[YouTubeProvider] YOUTUBE_API_KEY is not configured.');
      return { videos: [] };
    }

    const cacheKey = `${params.query}|${params.maxResults || 10}|${params.pageToken || ''}|${params.language || 'en'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    if (this.dailyQuotaEstimatedUsed >= this.dailyQuotaLimit) {
      console.warn('[YouTubeProvider] Daily estimated quota threshold reached. Skipping external call.');
      return { videos: [] };
    }

    const maxResults = Math.min(params.maxResults || 12, 25);
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('videoEmbeddable', 'true');
    searchUrl.searchParams.set('videoSyndicated', 'true');
    searchUrl.searchParams.set('videoDuration', 'medium');
    searchUrl.searchParams.set('maxResults', String(maxResults));
    searchUrl.searchParams.set('q', params.query);
    searchUrl.searchParams.set('relevanceLanguage', params.language || 'en');
    searchUrl.searchParams.set('safeSearch', params.safeSearch !== false ? 'moderate' : 'none');
    searchUrl.searchParams.set('key', this.apiKey);

    if (params.pageToken) {
      searchUrl.searchParams.set('pageToken', params.pageToken);
    }

    // YouTube search endpoint costs 100 units
    this.dailyQuotaEstimatedUsed += 100;

    const searchResponse = await this.safeFetch<{
      items?: YouTubeSearchItem[];
      nextPageToken?: string;
      pageInfo?: { totalResults: number };
    }>(searchUrl.toString());

    const items = searchResponse.items || [];
    const videoIds = items
      .map((item) => item.id.videoId)
      .filter((id): id is string => Boolean(id));

    if (videoIds.length === 0) {
      return { videos: [] };
    }

    // Fetch video details (contentDetails, status, statistics) for durations and embed verification
    // videos.list costs 1 unit
    this.dailyQuotaEstimatedUsed += 1;
    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('part', 'contentDetails,status,statistics');
    detailsUrl.searchParams.set('id', videoIds.join(','));
    detailsUrl.searchParams.set('key', this.apiKey);

    const detailsResponse = await this.safeFetch<{
      items?: YouTubeVideoDetailsItem[];
    }>(detailsUrl.toString()).catch((err) => {
      console.warn('[YouTubeProvider] Failed to fetch additional details:', err.message);
      return { items: [] };
    });

    const detailsMap = new Map<string, YouTubeVideoDetailsItem>();
    (detailsResponse.items || []).forEach((item) => detailsMap.set(item.id, item));

    const normalizedVideos: NormalizedVideoMetadata[] = [];

    for (const item of items) {
      const vId = item.id.videoId;
      if (!vId) continue;

      const details = detailsMap.get(vId);

      // Verify privacy and embeddability
      if (details?.status?.embeddable === false) {
        continue;
      }
      if (details?.status?.privacyStatus && details.status.privacyStatus !== 'public') {
        continue;
      }

      const durationSeconds = this.parseDuration(details?.contentDetails?.duration || '');
      if (durationSeconds > 0 && durationSeconds < 45) {
        continue;
      }
      const thumbnail =
        item.snippet.thumbnails.maxres?.url ||
        item.snippet.thumbnails.high?.url ||
        item.snippet.thumbnails.medium?.url ||
        item.snippet.thumbnails.default?.url ||
        `https://img.youtube.com/vi/${vId}/hqdefault.jpg`;

      normalizedVideos.push({
        provider: 'YOUTUBE',
        providerVideoId: vId,
        title: this.cleanHtmlEntities(item.snippet.title),
        description: this.cleanHtmlEntities(item.snippet.description),
        thumbnailUrl: thumbnail,
        playbackType: 'EMBED_YOUTUBE',
        embedUrl: `https://www.youtube.com/embed/${vId}`,
        originalUrl: `https://www.youtube.com/watch?v=${vId}`,
        durationSeconds,
        creatorName: item.snippet.channelTitle,
        creatorChannelUrl: `https://www.youtube.com/channel/${item.snippet.channelId}`,
        publishedAt: new Date(item.snippet.publishedAt),
        language: params.language || 'en',
        rightsStatus: 'EMBED_PERMITTED',
        licenseName: details?.contentDetails?.licensedContent ? 'Standard YouTube License (Embed Permitted)' : 'Creative Commons / Standard',
        attributionText: `Video courtesy of ${item.snippet.channelTitle} via official YouTube Data API. All rights belong to original creator. Embedding strictly permitted per YouTube Terms of Service.`,
        tags: [params.categorySlug || '', params.subcategorySlug || ''].filter(Boolean),
        metadataJson: {
          youtubeVideoId: vId,
          channelId: item.snippet.channelId,
          viewCount: details?.statistics?.viewCount,
        },
      });
    }

    const result: ProviderSearchResult = {
      videos: normalizedVideos,
      nextPageToken: searchResponse.nextPageToken,
      totalResults: searchResponse.pageInfo?.totalResults,
    };

    // Cache results for 1 hour to prevent redundant API calls
    this.cache.set(cacheKey, {
      result,
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    return result;
  }

  async checkAvailability(providerVideoId: string): Promise<boolean> {
    if (!this.isConfigured) return true;
    try {
      const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      detailsUrl.searchParams.set('part', 'status');
      detailsUrl.searchParams.set('id', providerVideoId);
      detailsUrl.searchParams.set('key', this.apiKey);

      const resp = await this.safeFetch<{ items?: YouTubeVideoDetailsItem[] }>(detailsUrl.toString());
      const item = resp.items?.[0];
      if (!item) return false;
      return item.status?.embeddable !== false && item.status?.privacyStatus === 'public';
    } catch {
      return false;
    }
  }

  private parseDuration(isoDuration: string): number {
    if (!isoDuration) return 0;
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  private cleanHtmlEntities(text: string): string {
    if (!text) return '';
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
}
