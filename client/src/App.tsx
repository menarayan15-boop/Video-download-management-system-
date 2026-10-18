import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { useAuth } from './context/AuthContext';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { CategoryPage } from './pages/CategoryPage';
import { WatchPage } from './pages/WatchPage';
import { CreatorProfilePage } from './pages/CreatorProfilePage';
import { FollowingFeedPage } from './pages/FollowingFeedPage';
import { SavedVideosPage } from './pages/SavedVideosPage';
import { LibraryPage } from './pages/LibraryPage';
import { WatchHistoryPage } from './pages/WatchHistoryPage';
import { PlaylistsPage } from './pages/PlaylistsPage';
import { PlaylistDetailPage } from './pages/PlaylistDetailPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { SubscriptionPlansPage } from './pages/SubscriptionPlansPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { RegisteredDevicesPage } from './pages/RegisteredDevicesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminVideosPage } from './pages/AdminVideosPage';
import { AdminModerationPage } from './pages/AdminModerationPage';
import { AdminSubscriptionsPage } from './pages/AdminSubscriptionsPage';
import { AdminDownloadsPage } from './pages/AdminDownloadsPage';
import { AdminDiscoveryPage } from './pages/AdminDiscoveryPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ErrorPage } from './pages/ErrorPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-12 text-center text-xs text-gray-400 space-y-3">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span>Verifying Vyntra session...</span>
      </div>
    );
  }
  if (!user) {
    const currentPath = window.location.pathname + window.location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(currentPath)}`} replace />;
  }
  return <>{children}</>;
};

// Admin Guard
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-12 text-center text-xs text-gray-400 space-y-3">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span>Verifying privileges...</span>
      </div>
    );
  }
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Core Discovery & Public Content Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/search" element={<ExplorePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/saved" element={<LibraryPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/categories" element={<CategoryPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/watch/:id" element={<WatchPage />} />
        <Route path="/creator/:id" element={<CreatorProfilePage />} />
        <Route path="/playlist/:id" element={<PlaylistDetailPage />} />
        <Route path="/pricing" element={<SubscriptionPlansPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/error" element={<ErrorPage />} />

        {/* Authenticated Routes */}
        <Route
          path="/following"
          element={
            <ProtectedRoute>
              <FollowingFeedPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/playlists"
          element={
            <ProtectedRoute>
              <PlaylistsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <WatchHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/downloads"
          element={
            <ProtectedRoute>
              <DownloadsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscriptions"
          element={
            <ProtectedRoute>
              <SubscriptionPlansPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout/:planId"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/devices"
          element={
            <ProtectedRoute>
              <RegisteredDevicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Protected Routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/videos"
          element={
            <AdminRoute>
              <AdminVideosPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/moderation"
          element={
            <AdminRoute>
              <AdminModerationPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/subscriptions"
          element={
            <AdminRoute>
              <AdminSubscriptionsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/downloads"
          element={
            <AdminRoute>
              <AdminDownloadsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/discovery"
          element={
            <AdminRoute>
              <AdminDiscoveryPage />
            </AdminRoute>
          }
        />

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default App;
