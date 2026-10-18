export type ContentProviderType = 'VYNTRA' | 'YOUTUBE' | 'NASA' | 'ARCHIVE' | 'EXTERNAL';

export type PlaybackType = 'DIRECT' | 'EMBED_YOUTUBE' | 'EMBED_GENERIC' | 'EXTERNAL_LINK';

export type ContentStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'RESTRICTED' | 'FLAGGED' | 'HIDDEN';

export type RightsStatus = 'PUBLIC_DOMAIN' | 'CREATIVE_COMMONS' | 'EMBED_PERMITTED' | 'STANDARD_LICENSE' | 'PROPRIETARY';

export interface NormalizedVideoMetadata {
  provider: ContentProviderType;
  providerVideoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  playbackType: PlaybackType;
  embedUrl?: string;
  videoUrl?: string;
  originalUrl: string;
  durationSeconds: number;
  creatorName: string;
  creatorChannelUrl?: string;
  publishedAt: Date;
  language?: string;
  rightsStatus: RightsStatus;
  licenseName?: string;
  attributionText: string;
  tags: string[];
  metadataJson?: Record<string, any>;
  categoryId?: string;
  subcategoryId?: string;
}

export interface ProviderSearchParams {
  query: string;
  maxResults?: number;
  pageToken?: string;
  categorySlug?: string;
  subcategorySlug?: string;
  language?: string;
  safeSearch?: boolean;
}

export interface ProviderSearchResult {
  videos: NormalizedVideoMetadata[];
  nextPageToken?: string;
  totalResults?: number;
}

export interface ProviderStatus {
  providerType: ContentProviderType;
  name: string;
  isEnabled: boolean;
  isConfigured: boolean;
  quotaUsed?: number;
  quotaLimit?: number;
  lastSyncAt?: Date | null;
  lastSyncStatus?: string | null;
  lastError?: string | null;
}

export interface SyncOptions {
  limitPerCategory?: number;
  forceRefresh?: boolean;
}
