import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentUser, initializeDefaultData } from './store';
import { ToastProvider } from './components/ui/Toast';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrdersPage from './pages/orders';
import DistributionModule from './pages/distribution';
import FinanceModule from './pages/finance';
import ReferencesPage from './pages/references';
import AuditPage from './pages/AuditPage';
import AdminPage from './pages/AdminPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentUser = getCurrentUser();
  return currentUser ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  useEffect(() => {
    // Инициализация данных при первом запуске
    initializeDefaultData();
  }, []);

  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/orders/*" element={<OrdersPage />} />
                    <Route path="/distribution/*" element={<DistributionModule />} />
                    <Route path="/finance/*" element={<FinanceModule />} />
                    <Route path="/references/*" element={<ReferencesPage />} />
                    <Route path="/audit" element={<AuditPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;

