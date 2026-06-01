import { useEffect, useState } from 'react';
import { Segmented, Skeleton, message, Modal } from 'antd';
import { RotateCcw } from 'lucide-react';
import {
  getCollection, restoreClientCascade, restoreInvestorCascade, restore,
} from '../../firebase/db';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard } from '../../components';
import { fmt, fmtDate } from '../../lib/format';

export default function SuperTrash() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('clients');
  const [data, setData] = useState({ clients: [], investors: [], applications: [] });
  const [admins, setAdmins] = useState({});

  const load = async () => {
    const [cl, inv, apps, users] = await Promise.all([
      getCollection('clients'),
      getCollection('investors'),
      getCollection('applications'),
      getCollection('users'),
    ]);
    setData({
      clients: cl.filter(r => r.deleted),
      investors: inv.filter(r => r.deleted),
      applications: apps.filter(r => r.deleted),
    });
    setAdmins(Object.fromEntries(users.map(u => [u.id, u.name])));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const doRestore = (type, row) => {
    Modal.confirm({
      title: 'Восстановить?',
      content: type === 'applications'
        ? 'Заявка вернётся в списки.'
        : 'Сущность и все связанные заявки будут восстановлены.',
      okText: 'Восстановить', cancelText: 'Отмена', centered: true,
      onOk: async () => {
        try {
          if (type === 'clients') await restoreClientCascade(row.id);
          else if (type === 'investors') await restoreInvestorCascade(row.id);
          else await restore('applications', row.id);
          message.success('Восстановлено');
          load();
        } catch (e) { message.error('Ошибка: ' + (e.message ?? e)); }
      },
    });
  };

  if (loading) return <div style={{ padding: 20 }}><Skeleton active /></div>;

  const rows = data[tab];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="Корзина" eyebrow="Платформа" />
      <div className="page-scroll">
        <Segmented block value={tab} onChange={setTab} style={{ marginBottom: 16 }}
          options={[
            { label: `Клиенты (${data.clients.length})`, value: 'clients' },
            { label: `Инвесторы (${data.investors.length})`, value: 'investors' },
            { label: `Заявки (${data.applications.length})`, value: 'applications' },
          ]} />

        {rows.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--txt-lo)', fontSize: 14 }}>
            Пусто
          </div>
        )}

        <div className="grid-list">
          {rows.map(r => (
            <GlassCard key={r.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tab === 'applications' ? r.product : r.name}
                    {tab === 'applications' && <span className="num faint" style={{ fontSize: 12, marginLeft: 8 }}>{fmt(r.amount)}</span>}
                  </div>
                  <div className="faint" style={{ fontSize: 11, marginTop: 2 }}>
                    Владелец: {admins[r.ownerId] ?? '—'}{r.deletedAt ? ` · удалено ${fmtDate(r.deletedAt.toMillis ? r.deletedAt.toMillis() : r.deletedAt)}` : ''}
                  </div>
                </div>
                <button onClick={() => doRestore(tab, r)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
                    fontSize: 12, fontWeight: 600, padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                    background: 'rgba(91,212,154,.1)', border: '1px solid rgba(91,212,154,.35)', color: 'var(--ok)' }}>
                  <RotateCcw size={14} strokeWidth={1.8} /> Вернуть
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
