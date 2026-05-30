import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AdminBottomNav, InvestorBottomNav, ClientBottomNav } from './BottomNav';

export default function AppShell() {
  const { role } = useAuth();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: '100dvh', maxWidth: 480, margin: '0 auto',
      position: 'relative',
    }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </div>
      {role === 'admin'    && <AdminBottomNav />}
      {role === 'investor' && <InvestorBottomNav />}
      {role === 'client'   && <ClientBottomNav />}
    </div>
  );
}
