const BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL as string) || '/api/v1';

class ApiError extends Error {
  statusCode: number;
  code?: string;
  details?: any;

  constructor(message: string, statusCode: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('vyntra_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.error || 'An unexpected error occurred',
      response.status,
      data.code,
      data.details || data.quota
    );
  }

  return data.data;
}

export const api = {
  // Auth
  register: (body: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),
  getMe: () => request<any>('/auth/me'),
  forgotPassword: (email: string) => request<any>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (body: any) => request<any>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),

  // Videos
  getVideos: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') searchParams.append(k, String(v));
      });
    }
    return request<any>(`/videos?${searchParams.toString()}`);
  },
  getVideoById: (id: string) => request<any>(`/videos/${id}`),
  createVideo: (body: any) => request<any>('/videos', { method: 'POST', body: JSON.stringify(body) }),
  updateVideo: (id: string, body: any) => request<any>(`/videos/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteVideo: (id: string) => request<any>(`/videos/${id}`, { method: 'DELETE' }),
  getCategories: () => request<any[]>('/categories'),

  // Social
  toggleLike: (id: string) => request<{ liked: boolean }>(`/social/videos/${id}/like`, { method: 'POST' }),
  toggleSave: (id: string) => request<{ saved: boolean }>(`/social/videos/${id}/save`, { method: 'POST' }),
  toggleFollow: (id: string) => request<{ following: boolean }>(`/social/users/${id}/follow`, { method: 'POST' }),
  getComments: (videoId: string) => request<any[]>(`/social/videos/${videoId}/comments`),
  addComment: (videoId: string, body: { content: string; parentId?: string }) =>
    request<any>(`/social/videos/${videoId}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  editComment: (id: string, content: string) =>
    request<any>(`/social/comments/${id}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  deleteComment: (id: string) => request<any>(`/social/comments/${id}`, { method: 'DELETE' }),
  recordWatchProgress: (videoId: string, progressSeconds: number, completed = false) =>
    request<any>(`/social/videos/${videoId}/watch-progress`, {
      method: 'POST',
      body: JSON.stringify({ progressSeconds, completed }),
    }),
  submitReport: (body: any) => request<any>('/social/reports', { method: 'POST', body: JSON.stringify(body) }),

  // Subscriptions
  getPlans: () => request<any[]>('/subscriptions/plans'),
  getMySubscription: () => request<any>('/subscriptions/me'),
  checkoutSubscription: (body: { planId: string; billingCycle?: string }) =>
    request<any>('/subscriptions/checkout', { method: 'POST', body: JSON.stringify(body) }),
  cancelSubscription: () => request<any>('/subscriptions/cancel', { method: 'POST' }),

  // Downloads & Quota
  getQuota: () => request<any>('/downloads/quota'),
  getDownloads: (params?: { status?: string; sort?: string }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.status) searchParams.append('status', params.status);
      if (params.sort) searchParams.append('sort', params.sort);
    }
    return request<any[]>(`/downloads?${searchParams.toString()}`);
  },
  requestDownload: (videoId: string, idempotencyKey: string) =>
    request<any>('/downloads', {
      method: 'POST',
      body: JSON.stringify({ videoId, idempotencyKey }),
    }),
  getDownloadById: (id: string) => request<any>(`/downloads/${id}`),
  retryDownload: (id: string) => request<any>(`/downloads/${id}/retry`, { method: 'POST' }),
  cancelDownload: (id: string) => request<any>(`/downloads/${id}/cancel`, { method: 'POST' }),
  completeDownload: (id: string) => request<any>(`/downloads/${id}/complete`, { method: 'POST' }),

  // Users & Profile
  getMyProfile: () => request<any>('/users/me'),
  updateMyProfile: (body: any) => request<any>('/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
  getSavedVideos: () => request<any[]>('/users/me/saved-videos'),
  clearSavedVideos: () => request<any>('/users/me/saved-videos', { method: 'DELETE' }),
  getWatchHistory: () => request<any[]>('/users/me/watch-history'),
  deleteWatchHistoryItem: (videoId: string) => request<any>(`/users/me/watch-history/${videoId}`, { method: 'DELETE' }),
  clearWatchHistory: () => request<any>('/users/me/watch-history', { method: 'DELETE' }),
  getContinueWatching: () => request<any[]>('/users/me/continue-watching'),
  removeContinueWatching: (videoId: string) =>
    request<any>(`/users/me/continue-watching/${videoId}`, { method: 'DELETE' }),
  clearContinueWatching: () => request<any>('/users/me/continue-watching', { method: 'DELETE' }),
  getCreatorProfile: (id: string) => request<any>(`/users/creator/${id}`),
  getDevices: () => request<any[]>('/users/me/devices'),
  registerDevice: (body: { deviceName: string; deviceIdentifier: string }) =>
    request<any>('/users/me/devices', { method: 'POST', body: JSON.stringify(body) }),
  revokeDevice: (id: string) => request<any>(`/users/me/devices/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => request<{ notifications: any[]; unreadCount: number }>('/notifications'),
  markAsRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllAsRead: () => request<any>('/notifications/mark-all-read', { method: 'POST' }),
  deleteNotification: (id: string) => request<any>(`/notifications/${id}`, { method: 'DELETE' }),
  clearAllNotifications: () => request<any>('/notifications', { method: 'DELETE' }),

  // Translation
  getLanguages: () => request<Record<string, string>>('/translate/languages'),
  translate: (body: { commentId?: string; text?: string; targetLang: string }) =>
    request<any>('/translate', { method: 'POST', body: JSON.stringify(body) }),

  // Admin
  getAdminStats: () => request<any>('/admin/stats'),
  getAdminUsers: (params?: { page?: number; limit?: number; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.search) searchParams.append('search', params.search);
    return request<any>(`/admin/users?${searchParams.toString()}`);
  },
  updateUserRole: (id: string, role: string) =>
    request<any>(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  deleteUser: (id: string) => request<any>(`/admin/users/${id}`, { method: 'DELETE' }),
  getAdminVideos: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    return request<any>(`/admin/videos?${searchParams.toString()}`);
  },
  getAdminModeration: () => request<any[]>('/admin/moderation'),
  updateReportStatus: (id: string, status: string) =>
    request<any>(`/admin/moderation/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getDownloadAuditLogs: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    return request<any>(`/admin/downloads?${searchParams.toString()}`);
  },
  updatePlanConfig: (id: string, body: any) =>
    request<any>(`/admin/plans/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // Multi-Category Discovery & Aggregation
  getCategoryBySlug: (slug: string) => request<any>(`/categories/${slug}`),
  getCategoryVideos: (slug: string, params?: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') searchParams.append(k, String(v));
      });
    }
    return request<any>(`/categories/${slug}/videos?${searchParams.toString()}`);
  },
  searchVideos: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') searchParams.append(k, String(v));
      });
    }
    return request<any>(`/search?${searchParams.toString()}`);
  },
  getProviders: () => request<any[]>('/providers'),
  getProviderStatus: (type: string) => request<any>(`/providers/${type}/status`),
  verifyVideoAvailability: (id: string) => request<{ isAvailable: boolean }>(`/videos/${id}/verify`, { method: 'POST' }),

  // Admin Discovery Governance
  getDiscoveryStats: () => request<any>('/admin/discovery/stats'),
  getDiscoveryJobs: (limit = 20) => request<any[]>(`/admin/discovery/jobs?limit=${limit}`),
  triggerDiscoverySync: (body?: { categoryId?: string; limitPerCategory?: number }) =>
    request<any>('/admin/discovery/sync', { method: 'POST', body: JSON.stringify(body || {}) }),
  getAdminProviders: () => request<any[]>('/admin/discovery/providers'),
  updateAdminProvider: (id: string, body: { isEnabled?: boolean; configuration?: any }) =>
    request<any>(`/admin/discovery/providers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminCreateCategory: (body: any) =>
    request<any>('/admin/discovery/categories', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateCategory: (id: string, body: any) =>
    request<any>(`/admin/discovery/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminCreateSubcategory: (body: any) =>
    request<any>('/admin/discovery/subcategories', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateSubcategory: (id: string, body: any) =>
    request<any>(`/admin/discovery/subcategories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminUpdateVideoStatus: (id: string, status: string, reason?: string) =>
    request<any>(`/admin/discovery/videos/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }),

  // Dynamic Featured Video Engine
  getFeaturedVideo: (excludeId?: string) => {
    const query = excludeId ? `?excludeId=${encodeURIComponent(excludeId)}` : '';
    return request<any>(`/featured-video${query}`);
  },
  getFeaturedVideos: (limit = 6) => request<any[]>(`/featured-videos?limit=${limit}`),
  getFeaturedAdminConfig: () => request<any>('/admin/featured-config'),
  updateFeaturedAdminConfig: (body: any) =>
    request<any>('/admin/featured-config', { method: 'POST', body: JSON.stringify(body) }),

  // Smart Personalized Recommendations & Feedback
  getPersonalizedRecommendations: (limit = 12) =>
    request<any[]>(`/recommendations?limit=${limit}`),
  getBecauseYouWatched: (limit = 6) =>
    request<any>(`/recommendations/because-you-watched?limit=${limit}`),
  recordRecommendationFeedback: (body: {
    videoId?: string;
    categoryId?: string;
    provider?: string;
    feedbackType: string;
    reason?: string;
  }) => request<any>('/recommendations/feedback', { method: 'POST', body: JSON.stringify(body) }),
  undoRecommendationFeedback: (id: string) =>
    request<any>(`/recommendations/feedback/${id}`, { method: 'DELETE' }),
  resetRecommendations: () =>
    request<any>('/recommendations/reset', { method: 'DELETE' }),
  getCategoryPreferences: () =>
    request<any[]>('/recommendations/preferences'),
  setCategoryPreferences: (categoryIds: string[]) =>
    request<any[]>('/recommendations/preferences', {
      method: 'PUT',
      body: JSON.stringify({ categoryIds }),
    }),

  // Advanced Search & Autocomplete
  getAutocompleteSuggestions: (q: string) =>
    request<string[]>(`/search/autocomplete?q=${encodeURIComponent(q)}`),
  getRecentSearches: () =>
    request<any[]>('/search/recent'),
  saveRecentSearch: (query: string) =>
    request<any>('/search/recent', { method: 'POST', body: JSON.stringify({ query }) }),
  deleteRecentSearch: (id: string) =>
    request<any>(`/search/recent/${id}`, { method: 'DELETE' }),
  clearRecentSearches: () =>
    request<any>('/search/recent', { method: 'DELETE' }),

  // Custom Playlists & Collections
  getMyPlaylists: () =>
    request<any[]>('/playlists'),
  createPlaylist: (body: { title: string; description?: string; isPrivate?: boolean }) =>
    request<any>('/playlists', { method: 'POST', body: JSON.stringify(body) }),
  getPlaylistById: (id: string, token?: string) => {
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return request<any>(`/playlists/${id}${query}`);
  },
  updatePlaylist: (id: string, body: { title?: string; description?: string; isPrivate?: boolean }) =>
    request<any>(`/playlists/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deletePlaylist: (id: string) =>
    request<any>(`/playlists/${id}`, { method: 'DELETE' }),
  addPlaylistItem: (playlistId: string, videoId: string) =>
    request<any>(`/playlists/${playlistId}/items`, { method: 'POST', body: JSON.stringify({ videoId }) }),
  removePlaylistItem: (playlistId: string, videoId: string) =>
    request<any>(`/playlists/${playlistId}/items/${videoId}`, { method: 'DELETE' }),
  reorderPlaylist: (playlistId: string, videoIds: string[]) =>
    request<any>(`/playlists/${playlistId}/reorder`, { method: 'PUT', body: JSON.stringify({ videoIds }) }),

  // Smart Learning Tools (Notes, Bookmarks, Study Helper)
  getVideoBookmarks: (videoId: string) =>
    request<any[]>(`/learning/${videoId}/bookmarks`),
  createVideoBookmark: (videoId: string, body: { timestampSeconds: number; title: string }) =>
    request<any>(`/learning/${videoId}/bookmarks`, { method: 'POST', body: JSON.stringify(body) }),
  deleteVideoBookmark: (videoId: string, bookmarkId: string) =>
    request<any>(`/learning/${videoId}/bookmarks/${bookmarkId}`, { method: 'DELETE' }),
  getVideoNotes: (videoId: string) =>
    request<any[]>(`/learning/${videoId}/notes`),
  createVideoNote: (videoId: string, body: { timestampSeconds?: number; content: string }) =>
    request<any>(`/learning/${videoId}/notes`, { method: 'POST', body: JSON.stringify(body) }),
  updateVideoNote: (videoId: string, noteId: string, content: string) =>
    request<any>(`/learning/${videoId}/notes/${noteId}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  deleteVideoNote: (videoId: string, noteId: string) =>
    request<any>(`/learning/${videoId}/notes/${noteId}`, { method: 'DELETE' }),
  getStudyHelper: (videoId: string) =>
    request<any>(`/learning/${videoId}/study-helper`),

  // User Viewing & Accessibility Preferences
  getUserPreferences: () =>
    request<any>('/preferences'),
  updateUserPreferences: (body: any) =>
    request<any>('/preferences', { method: 'PATCH', body: JSON.stringify(body) }),
};

