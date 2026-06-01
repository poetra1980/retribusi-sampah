import { Route, Navigate } from 'react-router-dom';
import PwaLayout from './PwaLayout';
import Login from './pages/Login';
import Home from './pages/Home';
import SearchCustomer from './pages/SearchCustomer';
import CustomerDetail from './pages/CustomerDetail';
import RecordPayment from './pages/RecordPayment';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentHistory from './pages/PaymentHistory';
import Settings from './pages/Settings';

export default function PwaRoutes() {
  return (
    <Route path="/pwa" element={<PwaLayout />}>
      <Route index element={<Navigate to="/pwa/home" replace />} />
      <Route path="login" element={<Login />} />
      <Route path="home" element={<Home />} />
      <Route path="search" element={<SearchCustomer />} />
      <Route path="customer/:id" element={<CustomerDetail />} />
      <Route path="payment/new" element={<RecordPayment />} />
      <Route path="success" element={<PaymentSuccess />} />
      <Route path="history" element={<PaymentHistory />} />
      <Route path="settings" element={<Settings />} />
    </Route>
  );
}
