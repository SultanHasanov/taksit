import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCollection, where, byCreatedAtDesc } from '../firebase/db';

/**
 * Находит запись клиента, привязанную к текущему пользователю (по uid), и грузит
 * ВСЕ его заявки (у клиента может быть несколько договоров). Возвращает также
 * выбранную заявку и сеттер для переключения между ними.
 */
export function useClientApps() {
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [apps, setApps]     = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const clients = (await getCollection('clients', [where('uid', '==', user.uid)])).filter(c => !c.deleted);
      const c = clients[0] ?? null;
      setClient(c);
      if (c) {
        const a = (await getCollection('applications', [where('clientId', '==', c.id)]))
          .filter(x => !x.deleted).sort(byCreatedAtDesc);
        setApps(a);
        setSelectedId(a[0]?.id ?? null);
      }
      setLoading(false);
    })();
  }, [user]);

  const selected = apps.find(a => a.id === selectedId) ?? apps[0] ?? null;
  return { client, apps, selected, selectedId: selected?.id ?? null, setSelectedId, loading };
}
