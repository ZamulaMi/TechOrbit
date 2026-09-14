import {
  Article,
  ArticleStatus,
  ArticleVersion,
  ArticleTranslation,
  Category,
  Tag,
  Author,
  Source,
  ChangeEvent,
  MediaItem,
  AdSlot,
  SocialLink,
  SeoSetting,
  NotificationItem,
  AuditLog,
  SyncJob,
  User,
  Language
} from '../types.ts';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    credentials: 'include' // send cookies
  });

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Auth
  auth: {
    getMe: () => fetchJson<{ user: User }>('/api/admin/me'),
    login: (body: { username: string; password: string }) =>
      fetchJson<{ success: boolean; user: User }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    logout: () => fetchJson<{ success: boolean }>('/api/admin/logout', { method: 'POST' }),
    changePassword: (body: { oldPassword?: string; newPassword: string }) =>
      fetchJson<{ success: boolean }>('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify(body)
      })
  },

  // Public
  public: {
    getArticles: (params?: { category?: string; tag?: string; lang?: Language; limit?: number; offset?: number; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.category) query.set('category', params.category);
      if (params?.tag) query.set('tag', params.tag);
      if (params?.lang) query.set('lang', params.lang);
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.offset) query.set('offset', params.offset.toString());
      if (params?.search) query.set('search', params.search);
      return fetchJson<{ articles: Article[]; total: number }>(`/api/public/articles?${query.toString()}`);
    },
    getArticle: (slug: string, lang: Language = 'uk') =>
      fetchJson<{ article: Article; translations: ArticleTranslation[]; jsonLd: any }>(`/api/public/articles/${slug}?lang=${lang}`),
    getCategories: () => fetchJson<Category[]>('/api/public/categories'),
    getSettings: () =>
      fetchJson<{ settings: Record<string, string>; socialLinks: SocialLink[]; homepageSections: any[] }>('/api/public/settings'),
    getAds: () => fetchJson<AdSlot[]>('/api/public/ads'),
    getSeo: (pageType: string) => fetchJson<SeoSetting | null>(`/api/public/seo/${pageType}`)
  },

  // Admin
  admin: {
    getStats: () =>
      fetchJson<{
        counts: {
          articlesTotal: number;
          published: number;
          reviewQueue: number;
          imported: number;
          sources: number;
          pendingChanges: number;
          translations: number;
          unreadNotifications: number;
        };
        recentArticles: Article[];
        recentChanges: ChangeEvent[];
        recentAudit: AuditLog[];
      }>('/api/admin/stats'),

    getArticles: (params?: { status?: ArticleStatus; categoryId?: string; sourceId?: string; search?: string; limit?: number; offset?: number }) => {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.categoryId) query.set('categoryId', params.categoryId);
      if (params?.sourceId) query.set('sourceId', params.sourceId);
      if (params?.search) query.set('search', params.search);
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.offset) query.set('offset', params.offset.toString());
      return fetchJson<{ articles: Article[]; total: number }>(`/api/admin/articles?${query.toString()}`);
    },
    getArticle: (id: string) => fetchJson<Article>(`/api/admin/articles/${id}`),
    createArticle: (data: Partial<Article>) =>
      fetchJson<Article>('/api/admin/articles', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateArticle: (id: string, data: Partial<Article> & { changeReason?: string }) =>
      fetchJson<Article>(`/api/admin/articles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    deleteArticle: (id: string) =>
      fetchJson<{ success: boolean }>(`/api/admin/articles/${id}`, {
        method: 'DELETE'
      }),

    // Moderation
    getReviewQueue: () => fetchJson<Article[]>('/api/admin/review-queue'),
    approveArticle: (id: string) => fetchJson<Article>(`/api/admin/articles/${id}/approve`, { method: 'POST' }),
    publishArticle: (id: string) => fetchJson<Article>(`/api/admin/articles/${id}/publish`, { method: 'POST' }),
    rejectArticle: (id: string, reason?: string) =>
      fetchJson<Article>(`/api/admin/articles/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      }),

    // Versions
    getVersions: (articleId: string) => fetchJson<ArticleVersion[]>(`/api/admin/articles/${articleId}/versions`),
    rollbackVersion: (articleId: string, versionId: string) =>
      fetchJson<{ success: boolean; article: Article }>(`/api/admin/articles/${articleId}/versions/${versionId}/rollback`, {
        method: 'POST'
      }),

    // Translations
    getTranslations: (articleId: string) => fetchJson<ArticleTranslation[]>(`/api/admin/articles/${articleId}/translations`),
    saveTranslation: (articleId: string, data: Partial<ArticleTranslation>) =>
      fetchJson<ArticleTranslation>(`/api/admin/articles/${articleId}/translations`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    translateWithAi: (articleId: string, targetLang: 'uk' | 'en') =>
      fetchJson<{ success: boolean; translation: ArticleTranslation }>(`/api/admin/articles/${articleId}/translate-ai`, {
        method: 'POST',
        body: JSON.stringify({ targetLang })
      }),

    // Changes & Diffs
    getChanges: () => fetchJson<ChangeEvent[]>('/api/admin/changes'),
    resolveChange: (id: string, action: 'merged' | 'dismissed') =>
      fetchJson<{ success: boolean }>(`/api/admin/changes/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action })
      }),

    // Sources
    getSources: () => fetchJson<Source[]>('/api/admin/sources'),
    createSource: (data: Partial<Source>) =>
      fetchJson<Source>('/api/admin/sources', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateSource: (id: string, data: Partial<Source>) =>
      fetchJson<Source>(`/api/admin/sources/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    deleteSource: (id: string) =>
      fetchJson<{ success: boolean }>(`/api/admin/sources/${id}`, {
        method: 'DELETE'
      }),
    testSource: (url: string) =>
      fetchJson<{ success: boolean; status?: number; title?: string; error?: string }>('/api/admin/sources/test', {
        method: 'POST',
        body: JSON.stringify({ url })
      }),
    triggerSync: (sourceId: string) =>
      fetchJson<{ success: boolean; job: SyncJob }>('/api/admin/sources/' + sourceId + '/sync', {
        method: 'POST'
      }),
    getSyncJobs: (sourceId?: string) => {
      const url = sourceId ? `/api/admin/sources/sync-jobs?sourceId=${sourceId}` : '/api/admin/sources/sync-jobs';
      return fetchJson<SyncJob[]>(url);
    },

    // Taxonomy
    getCategories: () => fetchJson<Category[]>('/api/admin/categories'),
    createCategory: (data: Partial<Category>) =>
      fetchJson<Category>('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getTags: () => fetchJson<Tag[]>('/api/admin/tags'),
    createTag: (data: Partial<Tag>) =>
      fetchJson<Tag>('/api/admin/tags', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getAuthors: () => fetchJson<Author[]>('/api/admin/authors'),
    createAuthor: (data: Partial<Author>) =>
      fetchJson<Author>('/api/admin/authors', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    // Media
    getMedia: () => fetchJson<MediaItem[]>('/api/admin/media'),
    createMedia: (data: Partial<MediaItem>) =>
      fetchJson<MediaItem>('/api/admin/media', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    deleteMedia: (id: string) =>
      fetchJson<{ success: boolean }>(`/api/admin/media/${id}`, {
        method: 'DELETE'
      }),

    // Settings
    getSettings: () => fetchJson<Record<string, string>>('/api/admin/settings'),
    updateSetting: (key: string, value: string) =>
      fetchJson<{ success: boolean }>('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ key, value })
      }),
    getAds: () => fetchJson<AdSlot[]>('/api/admin/ads'),
    updateAd: (id: string, data: Partial<AdSlot>) =>
      fetchJson<{ success: boolean }>(`/api/admin/ads/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    getSocialLinks: () => fetchJson<SocialLink[]>('/api/admin/social-links'),
    saveSocialLink: (data: Partial<SocialLink>) =>
      fetchJson<{ success: boolean }>('/api/admin/social-links', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getSeo: () => fetchJson<SeoSetting[]>('/api/admin/seo'),
    saveSeo: (data: Partial<SeoSetting>) =>
      fetchJson<{ success: boolean }>('/api/admin/seo', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    // Notifications
    getNotifications: () => fetchJson<NotificationItem[]>('/api/admin/notifications'),
    markNotificationRead: (id: string) =>
      fetchJson<{ success: boolean }>(`/api/admin/notifications/${id}/read`, {
        method: 'POST'
      }),
    markAllNotificationsRead: () =>
      fetchJson<{ success: boolean }>('/api/admin/notifications/read-all', {
        method: 'POST'
      }),

    // Users & Audit
    getUsers: () => fetchJson<User[]>('/api/admin/users'),
    getAuditLogs: (limit?: number, offset?: number) => {
      const url = limit ? `/api/admin/audit-logs?limit=${limit}&offset=${offset || 0}` : '/api/admin/audit-logs';
      return fetchJson<AuditLog[]>(url);
    },
    getSyncLogs: () => fetchJson<any[]>('/api/admin/sync-logs')
  }
};
