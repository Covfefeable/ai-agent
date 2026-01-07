import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { LoginPage } from './pages/login';
import { RegisterPage } from './pages/register';
import { ChatPage } from './pages/chat';
import { KnowledgePage } from './pages/knowledge';
import { KnowledgeDetailPage } from './pages/knowledge-detail';
import { DashboardLayout } from './components/DashboardLayout';
import { DocumentDetailPage } from './pages/document-detail';
import { UsersPage } from './pages/users';
import { AgentsPage } from './pages/agents';
import { AgentCategoriesPage } from './pages/agent-categories';
import { AgentsSquarePage } from './pages/agents-square';
import { AgentChatPage } from './pages/agent-chat';

function Layout() {
  return (
    <DashboardLayout>
      <Outlet />
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
          <Route path="/users" element={<UsersPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/agent-categories" element={<AgentCategoriesPage />} />
          <Route path="/agents-square" element={<AgentsSquarePage />} />
          <Route path="/agents-square/:id" element={<AgentChatPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
