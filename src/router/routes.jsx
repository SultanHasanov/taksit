import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spin } from 'antd';
import AppShell from '../layout/AppShell';

// Pages
import Login from '../pages/Login';

// Admin
import AdminDashboard    from '../pages/admin/Dashboard';
import AdminClients      from '../pages/admin/Clients';
import AdminApplications from '../pages/admin/Applications';
import NewApplication    from '../pages/admin/NewApplication';
import AdminInvestors    from '../pages/admin/Investors';
import AdminExpenses     from '../pages/admin/Expenses';
import AdminReports      from '../pages/admin/Reports';
import ApplicationDetail from '../pages/admin/ApplicationDetail';

// Investor
import InvPortfolio from '../pages/investor/Portfolio';
import InvReturns   from '../pages/investor/Returns';
import InvExpenses  from '../pages/investor/Expenses';
import InvProfile   from '../pages/investor/Profile';
import InvDetail    from '../pages/investor/ApplicationDetail';

// Client
import ClientHome     from '../pages/client/Home';
import ClientSchedule from '../pages/client/Schedule';
import ClientHistory  from '../pages/client/History';
import ClientProfile  from '../pages/client/Profile';
import ClientNotifications from '../pages/client/Notifications';

// Admin (extra)
import AdminSubscription from '../pages/admin/Subscription';

// Super admin
import SuperDashboard   from '../pages/super/Dashboard';
import SuperAdmins      from '../pages/super/Admins';
import SuperAdminDetail from '../pages/super/AdminDetail';
import SuperTariffs     from '../pages/super/Tariffs';
import SuperTrash       from '../pages/super/Trash';

function RoleGuard({ roles, children }) {
  const { user, role, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100dvh' }}>
      <Spin size="large" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) {
    const redirects = { superadmin: '/super', admin: '/admin', investor: '/portfolio', client: '/me' };
    return <Navigate to={redirects[role] ?? '/login'} replace />;
  }
  return children;
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },

  {
    path: '/',
    element: <RoleGuard><AppShell /></RoleGuard>,
    children: [
      { index: true, element: <RoleRedirect /> },

      // Super admin
      { path: 'super',             element: <RoleGuard roles={['superadmin']}><SuperDashboard /></RoleGuard> },
      { path: 'super/admins',      element: <RoleGuard roles={['superadmin']}><SuperAdmins /></RoleGuard> },
      { path: 'super/admins/:id',  element: <RoleGuard roles={['superadmin']}><SuperAdminDetail /></RoleGuard> },
      { path: 'super/tariffs',     element: <RoleGuard roles={['superadmin']}><SuperTariffs /></RoleGuard> },
      { path: 'super/trash',       element: <RoleGuard roles={['superadmin']}><SuperTrash /></RoleGuard> },

      // Admin
      { path: 'admin',             element: <RoleGuard roles={['admin']}><AdminDashboard /></RoleGuard> },
      { path: 'admin/subscription', element: <RoleGuard roles={['admin']}><AdminSubscription /></RoleGuard> },
      { path: 'admin/clients',     element: <RoleGuard roles={['admin']}><AdminClients /></RoleGuard> },
      { path: 'admin/apps',        element: <RoleGuard roles={['admin']}><AdminApplications /></RoleGuard> },
      { path: 'admin/apps/:id',    element: <RoleGuard roles={['admin']}><ApplicationDetail /></RoleGuard> },
      { path: 'admin/new-application', element: <RoleGuard roles={['admin']}><NewApplication /></RoleGuard> },
      { path: 'admin/new-application/:draftId', element: <RoleGuard roles={['admin']}><NewApplication /></RoleGuard> },
      { path: 'admin/investors',   element: <RoleGuard roles={['admin']}><AdminInvestors /></RoleGuard> },
      { path: 'admin/expenses',    element: <RoleGuard roles={['admin']}><AdminExpenses /></RoleGuard> },
      { path: 'admin/reports',     element: <RoleGuard roles={['admin']}><AdminReports /></RoleGuard> },

      // Investor
      { path: 'portfolio',     element: <RoleGuard roles={['investor']}><InvPortfolio /></RoleGuard> },
      { path: 'returns',       element: <RoleGuard roles={['investor']}><InvReturns /></RoleGuard> },
      { path: 'inv-expenses',  element: <RoleGuard roles={['investor']}><InvExpenses /></RoleGuard> },
      { path: 'inv-profile',   element: <RoleGuard roles={['investor']}><InvProfile /></RoleGuard> },
      { path: 'inv/apps/:id',  element: <RoleGuard roles={['investor']}><InvDetail /></RoleGuard> },

      // Client
      { path: 'me',          element: <RoleGuard roles={['client']}><ClientHome /></RoleGuard> },
      { path: 'schedule',    element: <RoleGuard roles={['client']}><ClientSchedule /></RoleGuard> },
      { path: 'history',     element: <RoleGuard roles={['client']}><ClientHistory /></RoleGuard> },
      { path: 'notifications', element: <RoleGuard roles={['client']}><ClientNotifications /></RoleGuard> },
      { path: 'cli-profile', element: <RoleGuard roles={['client']}><ClientProfile /></RoleGuard> },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
]);

function RoleRedirect() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role === 'superadmin') return <Navigate to="/super" replace />;
  if (role === 'admin')    return <Navigate to="/admin" replace />;
  if (role === 'investor') return <Navigate to="/portfolio" replace />;
  if (role === 'client')   return <Navigate to="/me" replace />;
  return <Navigate to="/login" replace />;
}
