export type Role = 'USER' | 'CREATOR' | 'ADMIN';
export type PlanName = 'FREE' | 'BRONZE' | 'SILVER' | 'GOLD';
export type DownloadStatus = 'REQUESTED' | 'AUTHORIZED' | 'RESERVED' | 'TRANSFERRING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  biography?: string;
  role: Role;
  createdAt: string;
  _count?: {
    followers?: number;
    following?: number;
    videos?: number;
    savedVideos?: number;
    downloadOperations?: number;
  };
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  displayOrder?: number;
  isActive?: boolean;
  _count?: {
    videos?: number;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
  isActive?: boolean;
  subcategories?: Subcategory[];
  _count?: {
    videos?: number;
  };
}

export type ContentProvider = 'VYNTRA' | 'YOUTUBE' | 'NASA' | 'ARCHIVE' | 'EXTERNAL';
export type PlaybackType = 'DIRECT' | 'EMBED_YOUTUBE' | 'EMBED_GENERIC' | 'EXTERNAL_LINK';
export type ContentStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'RESTRICTED' | 'FLAGGED' | 'HIDDEN';

export interface Video {
  id: string;
  creatorId?: string;
  title: string;
  slug?: string;
  description?: string;
  thumbnailUrl: string;
  videoUrl?: string;
  storageKey?: string;
  embedUrl?: string;
  originalUrl?: string;
  provider?: ContentProvider;
  providerVideoId?: string;
  playbackType?: PlaybackType;
  durationSeconds: number;
  fileSizeBytes: string;
  categoryId: string;
  subcategoryId?: string;
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  downloadAllowed: boolean;
  viewsCount: number;
  creatorName?: string;
  creatorChannelUrl?: string;
  contentStatus?: ContentStatus;
  rightsStatus?: string;
  licenseName?: string;
  attributionText?: string;
  tags?: string[];
  publishedAt: string;
  importedAt?: string;
  createdAt: string;
  creator?: {
    id: string;
    username: string;
    avatarUrl?: string;
    biography?: string;
    role?: Role;
    _count?: {
      followers?: number;
      videos?: number;
    };
  };
  category?: Category;
  subcategory?: Subcategory;
  _count?: {
    likes?: number;
    comments?: number;
  };
}

export interface ProviderStatus {
  providerType: ContentProvider;
  name: string;
  isEnabled: boolean;
  isConfigured: boolean;
  quotaUsed?: number;
  quotaLimit?: number;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastError?: string;
}

export interface ContentSyncJob {
  id: string;
  provider: ContentProvider;
  categoryId?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  itemsDiscovered: number;
  itemsImported: number;
  itemsSkipped: number;
  errorSummary?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: PlanName;
  displayName: string;
  price: number;
  billingInterval: 'DAILY' | 'MONTHLY' | 'YEARLY';
  downloadLimit: number;
  quotaPeriod: 'DAILY' | 'MONTHLY';
  deviceLimit: number;
  features: string[];
  badgeColor?: string;
  isActive: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'ACTIVE' | 'PENDING' | 'CANCELLED' | 'EXPIRED';
  startsAt: string;
  expiresAt?: string;
  autoRenew: boolean;
  plan: SubscriptionPlan;
}

export interface QuotaSummary {
  planName: string;
  downloadLimit: number;
  consumed: number;
  reserved: number;
  remaining: number;
  periodStart: string;
  periodEnd: string;
  timezone: string;
  resetTime: string;
}

export interface DownloadOperation {
  id: string;
  userId: string;
  videoId: string;
  subscriptionId?: string;
  status: DownloadStatus;
  quotaPeriodStart: string;
  quotaPeriodEnd: string;
  quotaReserved: number;
  quotaConsumed: number;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  failureCode?: string;
  fileSizeBytes?: string;
  video: Video;
  subscription?: UserSubscription;
  downloadToken?: string;
}

export interface Comment {
  id: string;
  userId: string;
  videoId: string;
  parentId?: string;
  content: string;
  isEdited: boolean;
  translatedContent?: string;
  translationLang?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
    role: Role;
  };
  replies?: Comment[];
  _count?: {
    commentLikes?: number;
    replies?: number;
  };
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface UserReport {
  id: string;
  reporterId: string;
  targetType: 'VIDEO' | 'COMMENT' | 'USER';
  targetId: string;
  reason: string;
  details?: string;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  reviewedAt?: string;
  reporter?: {
    id: string;
    username: string;
    email: string;
  };
}

export interface Playlist {
  id: string;
  userId: string;
  title: string;
  description?: string;
  isPrivate: boolean;
  shareToken?: string;
  createdAt: string;
  updatedAt: string;
  videoCount?: number;
  itemCount?: number;
  thumbnailUrl?: string | null;
  user?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  isOwner?: boolean;
  items?: PlaylistItem[];
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  videoId: string;
  order: number;
  addedAt: string;
  video: Video;
}

export interface VideoBookmark {
  id: string;
  userId: string;
  videoId: string;
  timestampSeconds: number;
  title: string;
  createdAt: string;
}

export interface VideoNote {
  id: string;
  userId: string;
  videoId: string;
  timestampSeconds?: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyHelper {
  videoId: string;
  videoTitle: string;
  category?: string;
  summary: string;
  explanation?: string;
  takeaways: string[];
  terminology: Array<string | { term: string; definition: string }>;
  revisionQuestions: string[];
  hasOfficialTranscript: boolean;
  transcriptNotice: string;
}

export interface UserPreference {
  id?: string;
  userId?: string;
  preferredLanguage: string;
  language?: string;
  captionsEnabled: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
  autoplay: boolean;
  soundOn: boolean;
  theme: 'dark' | 'high-contrast';
  emailNotifications: boolean;
  inAppNotifications: boolean;
}

export interface ContinueWatchingVideo extends Video {
  progressSeconds: number;
  progressPercentage: number;
  completed: boolean;
  lastWatchedAt: string;
}

export interface SearchHistoryItem {
  id: string;
  userId: string;
  query: string;
  createdAt: string;
}

export type FeedbackType = 'NOT_INTERESTED' | 'SHOW_FEWER' | 'HIDE_SOURCE' | 'REMOVE';

