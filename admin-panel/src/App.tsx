import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Licenses from '@/pages/Licenses';
import Products from '@/pages/Products';
import Users from '@/pages/Users';
import System from '@/pages/System';
import BotManager from '@/pages/BotManager';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AdminLayout from '@/components/layout/AdminLayout';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/licenses" element={<Licenses />} />
            <Route path="/products" element={<Products />} />
            <Route path="/users" element={<Users />} />
            <Route path="/system" element={<System />} />
            <Route path="/bot" element={<BotManager />} />
            {/* Add other routes here later */}
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
