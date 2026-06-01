import { Route, Navigate } from 'react-router-dom';
import WargaLayout from './WargaLayout';
import Login from './Login';
import Dashboard from './Dashboard';
import Bills from './Bills';
import Payments from './Payments';

export default function WargaRoutes() {
  return (
    <Route path="/warga" element={<WargaLayout />}>
      <Route index element={<Navigate to="/warga/dashboard" replace />} />
      <Route path="login" element={<Login />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="bills" element={<Bills />} />
      <Route path="payments" element={<Payments />} />
    </Route>
  );
}
