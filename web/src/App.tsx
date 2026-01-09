import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { LoginPage } from './pages/auth/login';
import { RegisterPage } from './pages/auth/register';
import { ChatPage } from './pages/chat';
import { KnowledgePage } from './pages/knowledge';
import { KnowledgeDetailPage } from './pages/knowledge/detail';
import { DashboardLayout } from './components/DashboardLayout';
import { DocumentDetailPage } from './pages/knowledge/document';
import { UsersPage } from './pages/admin/users';
import { AdminPage } from './pages/admin';
import { AgentsPage } from './pages/agent';
import { AgentCategoriesPage } from './pages/admin/categories';
import { AgentsSquarePage } from './pages/agent/square';
import { AgentChatPage } from './pages/agent/chat';
import { ModelsPage } from './pages/admin/models';
import { ProfilePage } from './pages/profile';

function Layout() {
  const location = useLocation();
  const element = useOutlet();

  return (
    <DashboardLayout>
      <AnimatePresence>
        {element && React.cloneElement(element, { key: location.pathname })}
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
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/agents-square" element={<AgentsSquarePage />} />
          <Route path="/agents-square/:id" element={<AgentChatPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
