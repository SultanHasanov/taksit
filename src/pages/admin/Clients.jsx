import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Modal, Form, message } from 'antd';
import { Search, Plus } from 'lucide-react';
import { AddressSuggestions } from 'react-dadata';
import 'react-dadata/dist/react-dadata.css';
import { useAuth } from '../../context/AuthContext';
import { getOwnedClients, getOwnedApplications, softDeleteClientCascade, byCreatedAtDesc, addDocument } from '../../firebase/db';
import { provisionAccount } from '../../firebase/adminUsers';
import { checkLimit } from '../../lib/limits';
import { PageHeader } from '../../layout/TopBar';
import { ClientRow, MiniDot } from '../../components';
import { computeOverdue } from '../../lib/format';

const DADATA_TOKEN = import.meta.env.VITE_DADATA_TOKEN ?? '';

const FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'ok',  label: 'В срок', dot: 'ok' },
  { key: 'warn',   label: '1–7 дн', dot: 'warn' },
  { key: 'orange', label: '8–30 дн', dot: 'orange' },
  { key: 'bad',    label: '30+ дн', dot: 'bad' },
];

export default function AdminClients() {
  const nav = useNavigate();
  const { ownerId, uid: myUid } = useAuth();
  const [clients, setClients] = useState([]);
  const [apps, setApps] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // create client modal
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [newAddr, setNewAddr] = useState('');

  const load = () => {
    if (!ownerId) return;
    Promise.all([
      getOwnedClients(ownerId),
      getOwnedApplications(ownerId),
    ]).then(([c, a]) => { setClients(c); setApps([...a].sort(byCreatedAtDesc)); });
  };
  useEffect(() => { load(); }, [ownerId]);

  const handleDelete = (client) => {
    Modal.confirm({
      title: `Удалить клиента «${client.name}»?`,
      content: 'Клиент и связанные с ним заявки будут скрыты. Восстановить может супер-админ.',
      okText: 'Удалить', okType: 'danger', cancelText: 'Отмена', centered: true,
      onOk: async () => {
        try {
          await softDeleteClientCascade(client.id, myUid);
          message.success('Клиент удалён');
          load();
        } catch (e) { message.error('Ошибка: ' + (e.message ?? e)); }
      },
    });
  };

  const handleCreate = async () => {
    const vals = await form.validateFields();
    const limit = await checkLimit(ownerId, 'clients');
    if (!limit.ok) {
      message.warning(`Достигнут лимит клиентов (${limit.limit}). Купите пакет в разделе «Подписка».`);
      return;
    }
    setSaving(true);
    try {
      const addr = newAddr || '';
      const { uid, login, password } = await provisionAccount(vals.name, 'client', { ownerId });
      await addDocument('clients', {
        name: vals.name,
        phone: vals.phone ?? '',
        address: addr,
        uid, login, password,
        ownerId, deleted: false,
        documents: [],
      });
      message.success(`Клиент «${vals.name}» добавлен, доступ выдан`);
      form.resetFields();
      setNewAddr('');
      setOpen(false);
      load();
    } catch (e) {
      message.error('Ошибка: ' + (e.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const merged = clients.map(c => {
    const cApps = apps.filter(a => a.clientId === c.id);
    const overdues = cApps.map(a => computeOverdue(a));
    const worst = overdues.reduce((acc, o) => (o.days > (acc?.days ?? -1) ? o : acc), null) ?? computeOverdue(null);
    return { ...c, apps: cApps, count: cApps.length, app: cApps[0] ?? null, overdue: worst };
  });

  const filtered = merged.filter(c => {
    const q = search.toLowerCase();
    const inProducts = c.apps.some(a => (a.product ?? '').toLowerCase().includes(q));
    if (q && !c.name.toLowerCase().includes(q) && !inProducts) return false;
    if (filter !== 'all' && c.overdue.dot !== filter) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="Клиенты" eyebrow="Админ"
        right={
          <button onClick={() => setOpen(true)}
            style={{ width:40,height:40,borderRadius:12,display:'grid',placeItems:'center',background:'var(--glass)',border:'1px solid var(--line)',color:'var(--txt-mid)',cursor:'pointer' }}>
            <Plus size={20} strokeWidth={2} />
          </button>
        }
      />
      <div className="page-scroll">
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Search size={18} strokeWidth={1.7} style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--txt-faint)', pointerEvents: 'none', zIndex: 1,
          }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени или товару"
            style={{
              width: '100%', background: '#0C1322', border: '1px solid var(--line)',
              borderRadius: 13, padding: '14px 15px 14px 42px', color: 'var(--txt-hi)',
              fontFamily: 'var(--body)', fontSize: 14.5, outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 11, fontSize: 12,
                fontWeight: 600, cursor: 'pointer', border: '1px solid var(--line)',
                background: filter === f.key ? 'var(--gold)' : 'var(--glass)',
                color: filter === f.key ? 'var(--navy-950)' : 'var(--txt-mid)',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
              {f.dot && <MiniDot type={f.dot} />}
              {f.label}{f.key === 'all' ? ` · ${filtered.length}` : ''}
            </button>
          ))}
        </div>

        <div className="grid-list">
          {filtered.map(c => (
            <ClientRow key={c.id} client={c}
              count={c.count}
              statusDot={c.app ? c.overdue.dot : undefined}
              statusLabel={c.app ? c.overdue.label : undefined}
              amount={c.app?.amount ?? 0}
              sub={c.count > 1
                ? `${c.count} договора · ${c.app?.product ?? '—'}`
                : `${c.app?.product ?? '—'} · до ${c.app?.term ?? '—'} мес`}
              onClick={() => c.app && nav(`/admin/apps/${c.app.id}`)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

      <Modal open={open} title="Новый клиент" okText="Создать" cancelText="Отмена"
        confirmLoading={saving} onOk={handleCreate}
        onCancel={() => { setOpen(false); form.resetFields(); setNewAddr(''); }}
        centered>
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="ФИО" name="name" rules={[{ required: true, message: 'Введите имя' }]}>
            <Input size="large" placeholder="Иванов Иван Иванович" />
          </Form.Item>
          <Form.Item label="Телефон" name="phone">
            <Input size="large" placeholder="+7 900 000 0000" />
          </Form.Item>
          <Form.Item label="Адрес" name="address">
            <AddressSuggestions
              token={DADATA_TOKEN}
              value={{ value: newAddr }}
              onChange={(s) => { const v = s?.value ?? ''; setNewAddr(v); form.setFieldValue('address', v); }}
              inputProps={{
                placeholder: 'Начните вводить адрес...',
                style: {
                  width: '100%', background: '#0C1322', border: '1px solid rgba(255,255,255,.07)',
                  borderRadius: 13, padding: '12px 15px', color: '#F4F0E6',
                  fontSize: 14.5, outline: 'none', fontFamily: 'var(--body)',
                },
              }}
            />
          </Form.Item>
          <div style={{ fontSize: 11.5, color: 'var(--txt-lo)' }}>
            Логин и пароль сгенерируются автоматически.
          </div>
        </Form>
      </Modal>
    </div>
  );
}
