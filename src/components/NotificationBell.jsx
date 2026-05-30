import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from 'antd';
import { Bell } from 'lucide-react';
import { subscribeCollection, where } from '../firebase/db';

/**
 * Колокольчик уведомлений с бейджем непрочитанных. Подписывается на
 * notifications клиента в реальном времени и ведёт на экран уведомлений.
 */
export default function NotificationBell({ clientId }) {
  const nav = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!clientId) return;
    const unsub = subscribeCollection('notifications', [where('clientId', '==', clientId)], rows => {
      setUnread(rows.filter(r => !r.read).length);
    });
    return unsub;
  }, [clientId]);

  return (
    <Badge count={unread} size="small" offset={[-4, 4]}>
      <button onClick={() => nav('/notifications')} title="Уведомления"
        style={{
          width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center',
          background: 'var(--glass)', border: '1px solid var(--line)',
          color: 'var(--txt-mid)', cursor: 'pointer',
        }}>
        <Bell size={18} strokeWidth={1.6} />
      </button>
    </Badge>
  );
}
