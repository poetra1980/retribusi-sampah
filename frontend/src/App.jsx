import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Regions from './pages/master/Regions';
import CustomerCategories from './pages/master/CustomerCategories';
import PaymentMethods from './pages/master/PaymentMethods';
import BillingPeriods from './pages/master/BillingPeriods';
import Users from './pages/master/Users';
import Officers from './pages/master/Officers';
import Customers from './pages/Customers';
import Tariffs from './pages/Tariffs';
import Bills from './pages/Bills';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Exports from './pages/Exports';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import PwaRoutes from './pwa/PwaRouter';
import WargaRoutes from './pages/warga/WargaRouter';
import LoadingSpinner from './components/ui/LoadingSpinner';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner fullPage />;

  if (!user) return <Navigate to="/login" replace />;

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner fullPage />;

  if (user) return <Navigate to="/" replace />;

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      {PwaRoutes()}
      {WargaRoutes()}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="master/regions" element={<Regions />} />
        <Route path="master/customer-categories" element={<CustomerCategories />} />
        <Route path="master/payment-methods" element={<PaymentMethods />} />
        <Route path="master/billing-periods" element={<BillingPeriods />} />
        <Route path="master/users" element={<Users />} />
        <Route path="master/officers" element={<Officers />} />
        <Route path="customers" element={<Customers />} />
        <Route path="tariffs" element={<Tariffs />} />
        <Route path="bills" element={<Bills />} />
        <Route path="payments" element={<Payments />} />
        <Route path="reports" element={<Reports />} />
        <Route path="exports" element={<Exports />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
