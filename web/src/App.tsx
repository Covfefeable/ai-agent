import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { LoginPage } from './pages/login';
import { RegisterPage } from './pages/register';
import { ChatPage } from './pages/chat';
import { KnowledgePage } from './pages/knowledge';
import { KnowledgeDetailPage } from './pages/knowledge-detail';
import { DashboardLayout } from './components/DashboardLayout';

function Dashboard() {
  return (
    <DashboardLayout>
      <ChatPage />
    </DashboardLayout>
  );
}

function KnowledgeDashboard() {
  return (
    <DashboardLayout>
      <KnowledgePage />
    </DashboardLayout>
  );
}

function KnowledgeDetailDashboard() {
  return (
    <DashboardLayout>
      <KnowledgeDetailPage />
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
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/knowledge"
          element={
            <PrivateRoute>
              <KnowledgeDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/knowledge/:id"
          element={
            <PrivateRoute>
              <KnowledgeDetailDashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
