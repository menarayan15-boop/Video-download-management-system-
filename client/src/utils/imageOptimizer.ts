// Image and Thumbnail Optimization Utilities for Vyntra Platform

// Universal fallback SVG thumbnail with dark glassmorphic styling and purple gradient
export const FALLBACK_THUMBNAIL_DATA_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f0728"/>
      <stop offset="50%" stop-color="#190d3d"/>
      <stop offset="100%" stop-color="#070314"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#a855f7" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#a855f7" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="640" cy="360" r="300" fill="url(#glow)"/>
  <circle cx="640" cy="360" r="48" fill="#7c3aed" fill-opacity="0.9"/>
  <polygon points="632,342 656,360 632,378" fill="#ffffff"/>
  <text x="640" y="445" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="600" fill="#c084fc" text-anchor="middle" letter-spacing="2">VYNTRA</text>
</svg>
`);

// Extract YouTube ID from any standard or shortened URL
export function extractYouTubeId(url: string | undefined | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|vi\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

// Generate the cascading list of YouTube thumbnail quality levels
// maxresdefault (1080p/720p) -> hqdefault (480p, always exists) -> mqdefault (360p)
export function getYouTubeThumbnailCascade(youtubeId: string): string[] {
  if (!youtubeId || !/^[a-zA-Z0-9_-]{11}$/.test(youtubeId)) {
    return [FALLBACK_THUMBNAIL_DATA_URL];
  }
  return [
    `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`,
  ];
}

// Resize Unsplash images dynamically to avoid loading multi-megabyte 1600px+ images
export function getOptimizedThumbnail(
  url: string | undefined | null,
  targetWidth: number = 480
): string {
  if (!url) return FALLBACK_THUMBNAIL_DATA_URL;

  // Unsplash dynamic resizing
  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('w', String(targetWidth));
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      parsed.searchParams.set('q', targetWidth > 800 ? '85' : '75');
      return parsed.toString();
    } catch {
      return url;
    }
  }

  return url;
}
