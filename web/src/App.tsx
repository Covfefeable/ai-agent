import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { LoginPage } from './pages/auth/login';
import { RegisterPage } from './pages/auth/register';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageTracker } from '@/components/page-tracker';

// Lazy load components
const ChatPage = lazy(() => import('./pages/chat').then(module => ({ default: module.ChatPage })));
const KnowledgePage = lazy(() => import('./pages/knowledge').then(module => ({ default: module.KnowledgePage })));
const KnowledgeDetailPage = lazy(() => import('./pages/knowledge/detail').then(module => ({ default: module.KnowledgeDetailPage })));
const DocumentDetailPage = lazy(() => import('./pages/knowledge/document').then(module => ({ default: module.DocumentDetailPage })));
const UsersPage = lazy(() => import('./pages/admin/users').then(module => ({ default: module.UsersPage })));
const AdminPage = lazy(() => import('./pages/admin').then(module => ({ default: module.AdminPage })));
const AgentsPage = lazy(() => import('./pages/agent').then(module => ({ default: module.AgentsPage })));
const AgentCategoriesPage = lazy(() => import('./pages/admin/categories').then(module => ({ default: module.AgentCategoriesPage })));
const AgentsSquarePage = lazy(() => import('./pages/agent/square').then(module => ({ default: module.AgentsSquarePage })));
const AgentChatPage = lazy(() => import('./pages/agent/chat').then(module => ({ default: module.AgentChatPage })));
const ModelsPage = lazy(() => import('./pages/admin/models').then(module => ({ default: module.ModelsPage })));
const ProfilePage = lazy(() => import('./pages/profile').then(module => ({ default: module.ProfilePage })));
const AnalyticsPage = lazy(() => import('./pages/admin/analytics').then(module => ({ default: module.AnalyticsPage })));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );
}

function Layout() {
  const location = useLocation();
  const element = useOutlet();

  return (
    <DashboardLayout>
      <AnimatePresence>
        <Suspense fallback={<LoadingSpinner />}>
          {element && React.cloneElement(element, { key: location.pathname })}
        </Suspense>
      </AnimatePresence>
    </DashboardLayout>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <PageTracker />
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<ChatPage />} />
          <Route path="/chat/:id" element={<AgentChatPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/knowledge/:id" element={<KnowledgeDetailPage />} />
          <Route path="/knowledge/:datasetId/document/:documentId"
            element={<DocumentDetailPage />}
          />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/agent-categories" element={<AgentCategoriesPage />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/agents-square" element={<AgentsSquarePage />} />
          <Route path="/agents-square/:id" element={<AgentChatPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
