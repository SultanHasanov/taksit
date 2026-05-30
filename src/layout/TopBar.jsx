import { Avatar, Badge } from 'antd';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = { admin: 'Админ', investor: 'Инвестор', client: 'Клиент' };

function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function TopBar({ title, subtitle, right }) {
  const { profile } = useAuth();
  const name = profile?.name ?? '';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 16px 4px', gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar
          style={{
            background: 'linear-gradient(150deg,#1A2740,#131D33)',
            border: '1px solid var(--line)',
            color: 'var(--gold-lite)',
            fontFamily: 'var(--disp)',
            fontWeight: 600,
            fontSize: 15,
            width: 42, height: 42, borderRadius: 13,
          }}
        >
          {initials(name)}
        </Avatar>
        <div>
          {subtitle && <div style={{ color: 'var(--txt-lo)', fontSize: 11 }}>{subtitle}</div>}
          <div className="h-title" style={{ fontSize: 18 }}>{title || name}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
        {profile?.role && (
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 600,
            padding: '5px 10px', borderRadius: 8, color: 'var(--gold-lite)',
            background: 'var(--gold-soft)', border: '1px solid var(--line-gold)',
          }}>
            {ROLE_LABELS[profile.role]}
          </span>
        )}
        {right || (
          <button style={{
            width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center',
            background: 'var(--glass)', border: '1px solid var(--line)',
            color: 'var(--txt-mid)', cursor: 'pointer',
          }}>
            <Bell size={18} strokeWidth={1.6} />
          </button>
        )}
      </div>
    </div>
  );
}

export function PageHeader({ title, eyebrow, onBack, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 16px 4px', gap: 14,
    }}>
      {onBack ? (
        <button onClick={onBack} style={{
          width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center',
          background: 'var(--glass)', border: '1px solid var(--line)',
          color: 'var(--txt-mid)', cursor: 'pointer', flexShrink: 0,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 5l-7 7 7 7"/>
          </svg>
        </button>
      ) : <div style={{ width: 40 }} />}

      <div style={{ textAlign: 'center', flex: 1 }}>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 3 }}>{eyebrow}</div>}
        <div className="h-title" style={{ fontSize: 17 }}>{title}</div>
      </div>

      {right || <div style={{ width: 40 }} />}
    </div>
  );
}
