import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Select, Modal, message, Skeleton } from 'antd';
import { Plus, RefreshCw } from 'lucide-react';
import { getCollection, updateDocument, where } from '../../firebase/db';
import { hasPending } from '../../lib/limits';
import { provisionAdminAccount, resetUserPassword } from '../../firebase/adminUsers';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard } from '../../components';
import CredentialsBox from '../../components/CredentialsBox';
import { fmt } from '../../lib/format';

export default function SuperAdmins() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [subs, setSubs] = useState([]);
  const [tariffs, setTariffs] = useState([]);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [created, setCreated] = useState(null); // { name, login, password, tariff }
  const [busyId, setBusyId] = useState(null);

  const load = () => Promise.all([
    getCollection('users', [where('role', '==', 'admin')]),
    getCollection('subscriptions'),
    getCollection('tariffs'),
  ]).then(([a, s, t]) => {
    setAdmins(a);
    setSubs(s);
    setTariffs(t.filter((x) => x.active !== false).sort((x, y) => (x.order ?? 0) - (y.order ?? 0)));
    setLoading(false);
  });

  useEffect(() => { load(); }, []);

  const subMap = useMemo(() => Object.fromEntries(subs.map((s) => [s.id, s])), [subs]);

  const createAdmin = async () => {
    const vals = await form.validateFields();
    setSaving(true);
    try {
      const { login, password } = await provisionAdminAccount(vals.name, {
        tariffId: vals.tariffId,
      });
      const tariff = tariffs.find((t) => t.id === vals.tariffId);

      setCreated({ name: vals.name, login, password, tariff: tariff?.name });
      form.resetFields();
      setOpen(false);
      message.success('Админ создан. Подтвердите оплату в его карточке.');
      load();
    } catch (e) {
      message.error('Ошибка: ' + (e.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (admin) => {
    Modal.confirm({
      title: `Сбросить пароль для «${admin.name}»?`,
      content: 'Будет сгенерирован новый пароль. Старый перестанет работать.',
      okText: 'Сбросить', cancelText: 'Отмена', centered: true,
      onOk: async () => {
        setBusyId(admin.id);
        try {
          const newPassword = await resetUserPassword({ email: admin.email, oldPassword: admin.password });
          await updateDocument('users', admin.id, { password: newPassword });
          message.success('Пароль сброшен');
          load();
        } catch (e) {
          message.error('Не удалось сбросить пароль: ' + (e.message ?? e));
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  if (loading) return <div style={{ padding: 20 }}><Skeleton active /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader
        title="Админы"
        eyebrow="Платформа"
        right={(
          <button
            onClick={() => setOpen(true)}
            style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--txt-mid)', cursor: 'pointer' }}
          >
            <Plus size={20} strokeWidth={2} />
          </button>
        )}
      />
      <div className="page-scroll">
        {admins.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--txt-lo)', fontSize: 14 }}>
            Пока нет админов. Создайте первого по кнопке +
          </div>
        )}
        <div className="grid-list">
          {admins.map((a) => {
            const sub = subMap[a.id];
            const tariff = tariffs.find((t) => t.id === sub?.tariffId);
            return (
              <GlassCard key={a.id} style={{ marginBottom: 11 }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}
                  onClick={() => nav(`/super/admins/${a.id}`)}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                    {a.login && <div className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>{a.login}</div>}
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="num" style={{ fontSize: 12.5 }}>{tariff?.name ?? '—'}</div>
                    <div
                      style={{
                        fontSize: 10.5,
                        marginTop: 3,
                        color: hasPending(sub) ? 'var(--warn)' : sub?.status === 'active' ? 'var(--ok)' : 'var(--txt-lo)',
                      }}
                    >
                      {hasPending(sub) ? 'Ожидает оплаты' : sub?.status === 'active' ? 'Активна' : 'Нет подписки'}
                    </div>
                  </div>
                </div>

                {a.login && a.password && (
                  <div style={{ marginTop: 12 }}>
                    <CredentialsBox login={a.login} password={a.password} />
                  </div>
                )}

                {a.login && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => handleReset(a)}
                      disabled={busyId === a.id || !a.password}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600,
                        padding: '8px 13px', borderRadius: 10, cursor: (busyId === a.id || !a.password) ? 'default' : 'pointer',
                        background: 'var(--glass)', border: '1px solid var(--line)',
                        color: (busyId === a.id || !a.password) ? 'var(--txt-faint)' : 'var(--txt-mid)',
                      }}
                    >
                      <RefreshCw size={14} strokeWidth={1.8} />
                      {busyId === a.id ? 'Сброс...' : 'Сбросить пароль'}
                    </button>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      </div>

      <Modal
        open={open}
        title="Новый админ"
        okText="Создать"
        cancelText="Отмена"
        confirmLoading={saving}
        onOk={createAdmin}
        onCancel={() => { setOpen(false); form.resetFields(); }}
        centered
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="ФИО" name="name" rules={[{ required: true, message: 'Введите имя' }]}>
            <Input size="large" placeholder="Иван Иванов" />
          </Form.Item>

          <Form.Item label="Тариф" name="tariffId" rules={[{ required: true, message: 'Выберите тариф' }]}>
            <Select
              size="large"
              placeholder="Выберите тариф"
              options={tariffs.map((t) => ({ value: t.id, label: `${t.name} · ${fmt(t.monthlyPrice)}/мес` }))}
            />
          </Form.Item>

          <div style={{ fontSize: 11.5, color: 'var(--txt-lo)' }}>
            Логин и пароль сгенерируются автоматически и будут показаны после создания.
            Подписка создаётся в статусе «ожидает оплаты».
          </div>
        </Form>
      </Modal>

      <Modal open={!!created} title="Админ создан" footer={null} onCancel={() => setCreated(null)} centered>
        {created && (
          <div style={{ paddingTop: 8 }}>
            {created.password ? (
              <CredentialsBox name={created.name} login={created.login} password={created.password} />
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--txt-mid)' }}>
                Логин: <b style={{ color: 'var(--txt-hi)' }}>{created.login}</b>
                <br />
                Пароль задан вручную и повторно не показывается.
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--txt-lo)', marginTop: 14 }}>
              Тариф: <b style={{ color: 'var(--txt-hi)' }}>{created.tariff}</b>. Откройте карточку админа,
              чтобы подтвердить оплату.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
