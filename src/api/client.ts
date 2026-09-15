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
  SyncLog,
  DiagnosticResult,
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
    getArticles: (params?: { category?: string; categoryId?: string; tag?: string; lang?: Language; limit?: number; offset?: number; search?: string; type?: 'news' | 'review' | 'all'; sortBy?: 'latest' | 'popular' | 'trending' | 'title' }) => {
      const query = new URLSearchParams();
      if (params?.category) query.set('category', params.category);
      if (params?.categoryId) query.set('categoryId', params.categoryId);
      if (params?.tag) query.set('tag', params.tag);
      if (params?.lang) query.set('lang', params.lang);
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.offset) query.set('offset', params.offset.toString());
      if (params?.search) query.set('search', params.search);
      if (params?.type) query.set('type', params.type);
      if (params?.sortBy) query.set('sortBy', params.sortBy);
      return fetchJson<{ articles: Article[]; total: number }>(`/api/public/articles?${query.toString()}`);
    },
    search: (query: string, lang: Language = 'uk', limit: number = 20, offset: number = 0) => {
      const q = new URLSearchParams();
      q.set('q', query);
      q.set('lang', lang);
      q.set('limit', limit.toString());
      q.set('offset', offset.toString());
      return fetchJson<{ articles: Article[]; total: number; query: string }>(`/api/public/search?${q.toString()}`);
    },
    getRelated: (articleId: string, limit: number = 4, lang: Language = 'uk') =>
      fetchJson<Article[]>(`/api/public/related/${articleId}?limit=${limit}&lang=${lang}`),
    getArticle: (slug: string, lang: Language = 'uk') =>
      fetchJson<{
        article: Article;
        translations: ArticleTranslation[];
        meta?: {
          title: string;
          description: string;
          canonical: string;
          robots: string;
          ogTitle: string;
          ogDescription: string;
          ogImage: string;
          ogUrl: string;
          twitterTitle: string;
          twitterDescription: string;
          twitterImage: string;
          hreflangs: { lang: string; href: string }[];
        };
        jsonLd: any;
        breadcrumbJsonLd?: any;
        breadcrumbs?: { name: string; url: string }[];
      }>(`/api/public/articles/${slug}?lang=${lang}`),
    getCategories: () => fetchJson<Category[]>('/api/public/categories'),
    getSettings: () =>
      fetchJson<{ settings: Record<string, string>; socialLinks: SocialLink[]; homepageSections: any[]; siteElements: any[] }>('/api/public/settings'),
    getSiteElements: () => fetchJson<any[]>('/api/public/site-elements'),
    getSocialLinks: () => fetchJson<SocialLink[]>('/api/public/social-links'),
    getHomepageSections: () => fetchJson<any[]>('/api/public/homepage-sections'),
    subscribeNewsletter: (email: string) =>
      fetchJson<{ success: boolean; message: string }>('/api/public/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),
    getAds: () => fetchJson<AdSlot[]>('/api/public/ads'),
    getSeo: (pageType: string) => fetchJson<SeoSetting | null>(`/api/public/seo/${pageType}`),
    getSeoGlobal: () =>
      fetchJson<{
        seo: SeoSetting;
        orgJsonLd: any;
        websiteJsonLdUk: any;
        websiteJsonLdEn: any;
        baseUrl: string;
      }>('/api/public/seo/global')
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
    getReviewQueue: (filters?: { sourceId?: string; categoryId?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (filters?.sourceId) q.set('sourceId', filters.sourceId);
      if (filters?.categoryId) q.set('categoryId', filters.categoryId);
      if (filters?.search) q.set('search', filters.search);
      return fetchJson<{
        newArticles: Article[];
        updatedArticles: Article[];
        translationsPending: Article[];
        publishingReady: Article[];
        counts: {
          newArticles: number;
          updatedArticles: number;
          translationsPending: number;
          publishingReady: number;
        };
      }>(`/api/admin/review-queue?${q.toString()}`);
    },
    approveArticle: (id: string) => fetchJson<Article>(`/api/admin/articles/${id}/approve`, { method: 'POST' }),
    publishArticle: (id: string) => fetchJson<Article>(`/api/admin/articles/${id}/publish`, { method: 'POST' }),
    rejectArticle: (id: string, reason?: string) =>
      fetchJson<Article>(`/api/admin/articles/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      }),
    updateTranslationStatus: (id: string, status: string) =>
      fetchJson<{ success: boolean }>(`/api/admin/articles/${id}/translation-status`, {
        method: 'POST',
        body: JSON.stringify({ status })
      }),

    // Versions
    getVersions: (articleId: string) => fetchJson<ArticleVersion[]>(`/api/admin/articles/${articleId}/versions`),
    rollbackVersion: (articleId: string, versionId: string) =>
      fetchJson<{ success: boolean; message: string; newVersionNumber?: number; article: Article }>(
        `/api/admin/articles/${articleId}/versions/${versionId}/rollback`,
        { method: 'POST' }
      ),
    compareVersions: (version1Id: string, version2Id: string) =>
      fetchJson<{ version1: ArticleVersion; version2: ArticleVersion; diff: any; summary: string }>(
        '/api/admin/versions/compare',
        {
          method: 'POST',
          body: JSON.stringify({ version1Id, version2Id })
        }
      ),

    // Translations
    getAllTranslations: (filters?: { status?: string; search?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      if (filters?.status) q.set('status', filters.status);
      if (filters?.search) q.set('search', filters.search);
      if (filters?.limit) q.set('limit', filters.limit.toString());
      if (filters?.offset) q.set('offset', filters.offset.toString());
      return fetchJson<{ items: any[]; total: number }>(`/api/admin/translations?${q.toString()}`);
    },
    getTranslations: (articleId: string) => fetchJson<ArticleTranslation[]>(`/api/admin/articles/${articleId}/translations`),
    getTranslationWorkspace: (articleId: string) =>
      fetchJson<{
        article: Article;
        uaTranslation: ArticleTranslation;
        enTranslation: ArticleTranslation | null;
        uaBlocks: any[];
        enBlocks: any[];
        sourceInfo: {
          source_name: string;
          source_url: string;
          source_author: string;
          source_published_at: string;
          rights_status: string;
        };
      }>(`/api/admin/articles/${articleId}/translation-workspace`),
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
    translateBlock: (articleId: string, block: any, targetLang: 'uk' | 'en') =>
      fetchJson<{ success: boolean; block: any }>(`/api/admin/articles/${articleId}/translate-block`, {
        method: 'POST',
        body: JSON.stringify({ block, targetLang })
      }),
    translateSeo: (articleId: string, meta: { title: string; description: string }, targetLang: 'uk' | 'en') =>
      fetchJson<{ success: boolean; seo: { meta_title: string; meta_description: string } }>(
        `/api/admin/articles/${articleId}/translate-seo`,
        {
          method: 'POST',
          body: JSON.stringify({ ...meta, targetLang })
        }
      ),
    approveTranslation: (articleId: string, language: 'uk' | 'en') =>
      fetchJson<{ success: boolean }>(`/api/admin/articles/${articleId}/approve-translation`, {
        method: 'POST',
        body: JSON.stringify({ language })
      }),
    rejectTranslation: (articleId: string, language: 'uk' | 'en', reason?: string) =>
      fetchJson<{ success: boolean }>(`/api/admin/articles/${articleId}/reject-translation`, {
        method: 'POST',
        body: JSON.stringify({ language, reason })
      }),
    getArticlePreview: (articleId: string, lang: 'uk' | 'en' = 'uk') =>
      fetchJson<{
        article: Article & { blocks: any[]; metaTitle?: string; metaDesc?: string };
        language: 'uk' | 'en';
        isDraftPreview: boolean;
        robotsMeta: string;
      }>(`/api/admin/articles/${articleId}/preview?lang=${lang}`),

    // Changes & Diffs
    getChanges: (filters?: { status?: string; sourceId?: string; severity?: string; changeType?: string }) => {
      const q = new URLSearchParams();
      if (filters?.status) q.set('status', filters.status);
      if (filters?.sourceId) q.set('sourceId', filters.sourceId);
      if (filters?.severity) q.set('severity', filters.severity);
      if (filters?.changeType) q.set('changeType', filters.changeType);
      return fetchJson<ChangeEvent[]>(`/api/admin/changes?${q.toString()}`);
    },
    getChange: (id: string) =>
      fetchJson<{
        changeEvent: ChangeEvent;
        oldSnapshot: any;
        newSnapshot: any;
        currentArticle: Article | null;
      }>(`/api/admin/changes/${id}`),
    resolveChange: (
      id: string,
      params:
        | 'merged'
        | 'dismissed'
        | {
            action: 'accept_all' | 'reject_all' | 'accept_selected' | 'reject_selected';
            acceptedFields?: string[];
            acceptedBlockIndices?: number[];
            comment?: string;
            deletedAction?: 'keep_published' | 'unpublish' | 'archive';
          }
    ) => {
      const body = typeof params === 'string' ? { action: params } : params;
      return fetchJson<{ success: boolean; message: string }>(`/api/admin/changes/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },
    simulateChange: (type: string, articleId: string) =>
      fetchJson<{ success: boolean; result: any }>('/api/admin/test/simulate-change', {
        method: 'POST',
        body: JSON.stringify({ type, articleId })
      }),

    // Sources
    getSources: () => fetchJson<Source[]>('/api/admin/sources'),
    getSource: (id: string) => fetchJson<Source>(`/api/admin/sources/${id}`),
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
    togglePauseSource: (id: string) =>
      fetchJson<Source>(`/api/admin/sources/${id}/pause`, {
        method: 'POST'
      }),
    deleteSource: (id: string) =>
      fetchJson<{ success: boolean }>(`/api/admin/sources/${id}`, {
        method: 'DELETE'
      }),
    testSource: (url: string, parserType?: string, config?: any) =>
      fetchJson<DiagnosticResult>('/api/admin/sources/test', {
        method: 'POST',
        body: JSON.stringify({ url, parserType, config })
      }),
    triggerSync: (sourceId: string) =>
      fetchJson<any>('/api/admin/sources/' + sourceId + '/sync', {
        method: 'POST'
      }),
    getSyncJobs: (sourceId?: string) => {
      const url = sourceId ? `/api/admin/sources/sync-jobs?sourceId=${sourceId}` : '/api/admin/sources/sync-jobs';
      return fetchJson<SyncJob[]>(url);
    },
    getSourceLogs: (sourceId: string, jobId?: string) => {
      const url = `/api/admin/sources/${sourceId}/logs${jobId ? '?jobId=' + jobId : ''}`;
      return fetchJson<SyncLog[]>(url);
    },
    getSourceArticles: (sourceId: string) =>
      fetchJson<Article[]>(`/api/admin/sources/${sourceId}/articles`),

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
    
    // Homepage Sections
    getHomepageSections: () => fetchJson<any[]>('/api/admin/homepage-sections'),
    saveHomepageSection: (data: any) =>
      fetchJson<{ success: boolean; section: any }>('/api/admin/homepage-sections', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    deleteHomepageSection: (id: string) =>
      fetchJson<{ success: boolean }>(`/api/admin/homepage-sections/${id}`, {
        method: 'DELETE'
      }),
    reorderHomepageSections: (ids: string[]) =>
      fetchJson<{ success: boolean }>('/api/admin/homepage-sections/reorder', {
        method: 'POST',
        body: JSON.stringify({ ids })
      }),

    // Site Elements
    getSiteElements: () => fetchJson<any[]>('/api/admin/site-elements'),
    saveSiteElement: (data: any) =>
      fetchJson<{ success: boolean; element: any }>('/api/admin/site-elements', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    toggleSiteElement: (id: string, enabled: boolean) =>
      fetchJson<{ success: boolean; enabled: boolean }>(`/api/admin/site-elements/${id}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ enabled })
      }),
    reorderSiteElements: (ids: string[]) =>
      fetchJson<{ success: boolean }>('/api/admin/site-elements/reorder', {
        method: 'POST',
        body: JSON.stringify({ ids })
      }),

    // Ads & Social
    getAds: () => fetchJson<AdSlot[]>('/api/admin/ads'),
    updateAd: (id: string, data: Partial<AdSlot>) =>
      fetchJson<{ success: boolean }>(`/api/admin/ads/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    getSocialLinks: () => fetchJson<SocialLink[]>('/api/admin/social-links'),
    saveSocialLink: (data: Partial<SocialLink>) =>
      fetchJson<{ success: boolean; link?: SocialLink }>('/api/admin/social-links', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    saveSocialLinksBatch: (links: Partial<SocialLink>[]) =>
      fetchJson<{ success: boolean; links: SocialLink[] }>('/api/admin/social-links/batch', {
        method: 'POST',
        body: JSON.stringify({ links })
      }),
    deleteSocialLink: (id: string) =>
      fetchJson<{ success: boolean }>(`/api/admin/social-links/${id}`, {
        method: 'DELETE'
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
