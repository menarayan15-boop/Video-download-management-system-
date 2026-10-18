import { BaseVideoProvider } from './base.provider.js';
import {
  ContentProviderType,
  NormalizedVideoMetadata,
  ProviderSearchParams,
  ProviderSearchResult,
  ProviderStatus,
} from '../types.js';

interface ArchiveSearchDoc {
  identifier: string;
  title?: string;
  description?: string;
  creator?: string;
  date?: string;
  publicdate?: string;
  mediatype?: string;
  format?: string[];
  licenseurl?: string;
}

export class ArchiveProvider extends BaseVideoProvider {
  readonly providerType: ContentProviderType = 'ARCHIVE';
  readonly name = 'Internet Archive (Open Source & Educational)';
  readonly isConfigured = true;

  private cache: Map<string, { result: ProviderSearchResult; expiresAt: number }> = new Map();

  override async getStatus(): Promise<ProviderStatus> {
    return {
      providerType: this.providerType,
      name: this.name,
      isEnabled: true,
      isConfigured: true,
      quotaUsed: 0,
      quotaLimit: 10000,
    };
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const cacheKey = `${params.query}|${params.maxResults || 10}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    try {
      const searchUrl = new URL('https://archive.org/advancedsearch.php');
      const safeQuery = params.query.replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'science';
      // Query video media types in open educational archives
      searchUrl.searchParams.set(
        'q',
        `(${safeQuery}) AND mediatype:(movies) AND format:(512Kb MPEG4 OR h.264 OR MP4)`
      );
      searchUrl.searchParams.set('fl[]', 'identifier,title,description,creator,date,publicdate,mediatype,licenseurl');
      searchUrl.searchParams.set('rows', String(Math.min(params.maxResults || 10, 20)));
      searchUrl.searchParams.set('page', '1');
      searchUrl.searchParams.set('output', 'json');

      const resp = await this.safeFetch<{
        response?: {
          numFound: number;
          docs?: ArchiveSearchDoc[];
        };
      }>(searchUrl.toString(), {}, 2, 12000);

      const docs = resp.response?.docs || [];
      const normalizedVideos: NormalizedVideoMetadata[] = [];

      for (const doc of docs) {
        if (!doc.identifier) continue;

        const id = doc.identifier;
        const thumbnailUrl = `https://archive.org/services/img/${encodeURIComponent(id)}`;
        const embedUrl = `https://archive.org/embed/${encodeURIComponent(id)}`;
        const originalUrl = `https://archive.org/details/${encodeURIComponent(id)}`;
        const directVideoUrl = `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(id)}.mp4`;

        const creator = doc.creator || 'Internet Archive Contributor';
        const license = doc.licenseurl || 'Creative Commons / Public Domain Archive Material';

        normalizedVideos.push({
          provider: 'ARCHIVE',
          providerVideoId: id,
          title: doc.title || `Archive Video: ${id}`,
          description: (doc.description || 'Open educational and historical documentary video preserved by Internet Archive.').slice(0, 1000),
          thumbnailUrl,
          playbackType: 'EMBED_GENERIC',
          embedUrl,
          videoUrl: directVideoUrl,
          originalUrl,
          durationSeconds: 300,
          creatorName: creator,
          creatorChannelUrl: `https://archive.org/details/@${encodeURIComponent(creator)}`,
          publishedAt: new Date(doc.publicdate || doc.date || Date.now()),
          language: 'en',
          rightsStatus: 'PUBLIC_DOMAIN',
          licenseName: license,
          attributionText: `Preserved and hosted by Internet Archive under ${license}. Accessible for educational, research, and non-commercial study.`,
          tags: ['Archive', 'Documentary', 'Educational', 'History'],
          metadataJson: {
            archiveId: id,
            licenseUrl: doc.licenseurl,
          },
        });
      }

      const result: ProviderSearchResult = {
        videos: normalizedVideos,
        totalResults: resp.response?.numFound,
      };

      this.cache.set(cacheKey, {
        result,
        expiresAt: Date.now() + 60 * 60 * 1000,
      });

      return result;
    } catch (err: any) {
      console.error('[ArchiveProvider] Search error:', err.message);
      return { videos: [] };
    }
  }

  async checkAvailability(providerVideoId: string): Promise<boolean> {
    try {
      const metaUrl = `https://archive.org/metadata/${encodeURIComponent(providerVideoId)}`;
      const resp = await this.safeFetch<{ files?: any[] }>(metaUrl);
      return Boolean(resp.files && resp.files.length > 0);
    } catch {
      return false;
    }
  }
}
