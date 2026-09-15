import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import { PublicHeader } from './components/layout/PublicHeader.tsx';
import { PublicFooter } from './components/layout/PublicFooter.tsx';

// Public pages
import { HomePage } from './pages/public/HomePage.tsx';
import { ArticlePage } from './pages/public/ArticlePage.tsx';
import { CategoryPage } from './pages/public/CategoryPage.tsx';
import { NewsPage } from './pages/public/NewsPage.tsx';
import { ReviewsPage } from './pages/public/ReviewsPage.tsx';
import { SearchPage } from './pages/public/SearchPage.tsx';
import { AboutPage } from './pages/public/AboutPage.tsx';
import { ContactPage } from './pages/public/ContactPage.tsx';
import { PrivacyPage } from './pages/public/PrivacyPage.tsx';
import { TermsPage } from './pages/public/TermsPage.tsx';

// Admin pages
import { LoginPage } from './pages/admin/LoginPage.tsx';
import { DashboardPage } from './pages/admin/DashboardPage.tsx';
import { ArticlesListPage } from './pages/admin/ArticlesListPage.tsx';
import { ArticleEditorPage } from './pages/admin/ArticleEditorPage.tsx';
import { ReviewQueuePage } from './pages/admin/ReviewQueuePage.tsx';
import { SourcesPage } from './pages/admin/SourcesPage.tsx';
import { ChangesPage } from './pages/admin/ChangesPage.tsx';
import { MediaPage } from './pages/admin/MediaPage.tsx';
import { CategoriesPage } from './pages/admin/CategoriesPage.tsx';
import { SettingsPage } from './pages/admin/SettingsPage.tsx';
import { AuditLogsPage } from './pages/admin/AuditLogsPage.tsx';
import { TranslationsPage } from './pages/admin/TranslationsPage.tsx';
import { HomepageBuilderPage } from './pages/admin/HomepageBuilderPage.tsx';
import { SiteElementsPage } from './pages/admin/SiteElementsPage.tsx';

import { api } from './api/client.ts';
import { Category, Language } from './types.ts';

export function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  const [currentLang, setCurrentLang] = useState<Language>('uk');
  const [categories, setCategories] = useState<Category[]>([]);

  // Synchronize language state if URL starts with /uk or /en
  useEffect(() => {
    if (location.pathname.startsWith('/en')) {
      setCurrentLang('en');
    } else if (location.pathname.startsWith('/uk')) {
      setCurrentLang('uk');
    }
  }, [location.pathname]);

  useEffect(() => {
    // Load public categories for navigation
    api.public
      .getCategories()
      .then(cats => setCategories(cats))
      .catch(err => console.error('Failed to load categories', err));
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
        {!isAdminRoute && (
          <PublicHeader
            categories={categories}
            currentLang={currentLang}
            onLanguageChange={setCurrentLang}
          />
        )}

        <div className="flex-1">
          <Routes>
            {/* Admin CMS Routes */}
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/admin/homepage" element={<HomepageBuilderPage />} />
            <Route path="/admin/elements" element={<SiteElementsPage />} />
            <Route path="/admin/articles" element={<ArticlesListPage />} />
            <Route path="/admin/articles/new" element={<ArticleEditorPage />} />
            <Route path="/admin/articles/:id/edit" element={<ArticleEditorPage />} />
            <Route path="/admin/translations" element={<TranslationsPage />} />
            <Route path="/admin/articles/:id/translate" element={<TranslationsPage />} />
            <Route path="/admin/review" element={<ReviewQueuePage />} />
            <Route path="/admin/review-queue" element={<ReviewQueuePage />} />
            <Route path="/admin/sources" element={<SourcesPage />} />
            <Route path="/admin/changes" element={<ChangesPage />} />
            <Route path="/admin/media" element={<MediaPage />} />
            <Route path="/admin/categories" element={<CategoriesPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
            <Route path="/admin/audit" element={<AuditLogsPage />} />

            {/* Localized Public Routes: Ukrainian */}
            <Route path="/uk" element={<HomePage currentLang="uk" categories={categories} />} />
            <Route path="/uk/" element={<HomePage currentLang="uk" categories={categories} />} />
            <Route path="/uk/news" element={<NewsPage currentLang="uk" categories={categories} />} />
            <Route path="/uk/reviews" element={<ReviewsPage currentLang="uk" categories={categories} />} />
            <Route path="/uk/search" element={<SearchPage currentLang="uk" categories={categories} />} />
            <Route path="/uk/about" element={<AboutPage currentLang="uk" />} />
            <Route path="/uk/contact" element={<ContactPage currentLang="uk" />} />
            <Route path="/uk/privacy" element={<PrivacyPage currentLang="uk" />} />
            <Route path="/uk/terms" element={<TermsPage currentLang="uk" />} />
            <Route path="/uk/article/:slug" element={<ArticlePage currentLang="uk" onLanguageChange={setCurrentLang} />} />
            <Route path="/uk/category/:slug" element={<CategoryPage currentLang="uk" categories={categories} />} />
            <Route path="/uk/:category" element={<CategoryPage currentLang="uk" categories={categories} />} />

            {/* Localized Public Routes: English */}
            <Route path="/en" element={<HomePage currentLang="en" categories={categories} />} />
            <Route path="/en/" element={<HomePage currentLang="en" categories={categories} />} />
            <Route path="/en/news" element={<NewsPage currentLang="en" categories={categories} />} />
            <Route path="/en/reviews" element={<ReviewsPage currentLang="en" categories={categories} />} />
            <Route path="/en/search" element={<SearchPage currentLang="en" categories={categories} />} />
            <Route path="/en/about" element={<AboutPage currentLang="en" />} />
            <Route path="/en/contact" element={<ContactPage currentLang="en" />} />
            <Route path="/en/privacy" element={<PrivacyPage currentLang="en" />} />
            <Route path="/en/terms" element={<TermsPage currentLang="en" />} />
            <Route path="/en/article/:slug" element={<ArticlePage currentLang="en" onLanguageChange={setCurrentLang} />} />
            <Route path="/en/category/:slug" element={<CategoryPage currentLang="en" categories={categories} />} />
            <Route path="/en/:category" element={<CategoryPage currentLang="en" categories={categories} />} />

            {/* Unprefixed / Default Public Routes */}
            <Route path="/" element={<HomePage currentLang={currentLang} categories={categories} />} />
            <Route path="/news" element={<NewsPage currentLang={currentLang} categories={categories} />} />
            <Route path="/reviews" element={<ReviewsPage currentLang={currentLang} categories={categories} />} />
            <Route path="/search" element={<SearchPage currentLang={currentLang} categories={categories} />} />
            <Route path="/about" element={<AboutPage currentLang={currentLang} />} />
            <Route path="/contact" element={<ContactPage currentLang={currentLang} />} />
            <Route path="/privacy" element={<PrivacyPage currentLang={currentLang} />} />
            <Route path="/terms" element={<TermsPage currentLang={currentLang} />} />
            <Route path="/article/:slug" element={<ArticlePage currentLang={currentLang} onLanguageChange={setCurrentLang} />} />
            <Route path="/category/:slug" element={<CategoryPage currentLang={currentLang} categories={categories} />} />

            {/* Fallback */}
            <Route path="*" element={<HomePage currentLang={currentLang} categories={categories} />} />
          </Routes>
        </div>

        {!isAdminRoute && (
          <PublicFooter categories={categories} currentLang={currentLang} />
        )}
      </div>
    </AuthProvider>
  );
}

export default App;
