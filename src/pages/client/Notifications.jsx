import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from 'antd';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCollection, where, byCreatedAtDesc, updateDocument } from '../../firebase/db';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard } from '../../components';
import { dayjs } from '../../lib/format';

const fmtWhen = (ts) => {
  const d = ts?.toDate?.() ?? ts;
  return d ? dayjs(d).format('D MMM, HH:mm') : '';
};

export default function ClientNotifications() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const clients = await getCollection('clients', [where('uid', '==', user.uid)]);
      const c = clients[0];
      if (!c) { setLoading(false); return; }
      const rows = (await getCollection('notifications', [where('clientId', '==', c.id)])).sort(byCreatedAtDesc);
      setItems(rows);
      setLoading(false);
      // отметить непрочитанные как прочитанные
      for (const n of rows.filter(r => !r.read)) {
        updateDocument('notifications', n.id, { read: true }).catch(() => {});
      }
    })();
  }, [user]);

  if (loading) return <div style={{ padding: 20 }}><Skeleton active /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="Уведомления" eyebrow="Клиент" onBack={() => nav(-1)} />
      <div className="page-scroll">
        {items.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--txt-lo)' }}>
            <Bell size={38} strokeWidth={1} style={{ opacity: .4, marginBottom: 12 }} />
            <div style={{ fontSize: 14 }}>Уведомлений пока нет</div>
          </div>
        )}

        {items.map(n => (
          <GlassCard key={n.id} style={{ marginBottom: 10, padding: '14px 16px', display: 'flex', gap: 13 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: 'grid', placeItems: 'center',
              color: 'var(--gold-lite)', background: 'var(--navy-700)', border: '1px solid var(--line-gold)',
            }}>
              <Bell size={17} strokeWidth={1.7} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--txt-hi)', whiteSpace: 'pre-wrap' }}>{n.text}</div>
              <div className="faint" style={{ fontSize: 11, marginTop: 6 }}>{fmtWhen(n.createdAt)}</div>
            </div>
            {!n.read && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold-lite)', flexShrink: 0, marginTop: 4 }} />
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
