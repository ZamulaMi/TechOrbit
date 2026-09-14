import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import { PublicHeader } from './components/layout/PublicHeader.tsx';
import { PublicFooter } from './components/layout/PublicFooter.tsx';

// Public pages
import { HomePage } from './pages/public/HomePage.tsx';
import { ArticlePage } from './pages/public/ArticlePage.tsx';
import { CategoryPage } from './pages/public/CategoryPage.tsx';

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

import { api } from './api/client.ts';
import { Category, Language } from './types.ts';

export function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  const [currentLang, setCurrentLang] = useState<Language>('uk');
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        <div className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route
              path="/"
              element={<HomePage currentLang={currentLang} categories={categories} />}
            />
            <Route
              path="/article/:slug"
              element={
                <ArticlePage
                  currentLang={currentLang}
                  onLanguageChange={setCurrentLang}
                />
              }
            />
            <Route
              path="/category/:slug"
              element={
                <CategoryPage
                  currentLang={currentLang}
                  categories={categories}
                />
              }
            />

            {/* Admin CMS Routes */}
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/admin/articles" element={<ArticlesListPage />} />
            <Route path="/admin/articles/new" element={<ArticleEditorPage />} />
            <Route path="/admin/articles/:id/edit" element={<ArticleEditorPage />} />
            <Route path="/admin/review-queue" element={<ReviewQueuePage />} />
            <Route path="/admin/sources" element={<SourcesPage />} />
            <Route path="/admin/changes" element={<ChangesPage />} />
            <Route path="/admin/media" element={<MediaPage />} />
            <Route path="/admin/categories" element={<CategoriesPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
            <Route path="/admin/audit" element={<AuditLogsPage />} />

            {/* Fallback */}
            <Route
              path="*"
              element={<HomePage currentLang={currentLang} categories={categories} />}
            />
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
