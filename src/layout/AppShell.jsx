import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AdminBottomNav, InvestorBottomNav, ClientBottomNav, SuperBottomNav } from './BottomNav';
import Sidebar from './Sidebar';

export default function AppShell() {
  const { role } = useAuth();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </div>
        {role === 'superadmin' && <SuperBottomNav />}
        {role === 'admin'      && <AdminBottomNav />}
        {role === 'investor'   && <InvestorBottomNav />}
        {role === 'client'     && <ClientBottomNav />}
      </div>
    </div>
  );
}
