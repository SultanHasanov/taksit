import { useState } from 'react';
import { Form, Input, Button, Modal, message, Skeleton } from 'antd';
import { Plus, Layers, KeyRound, RefreshCw } from 'lucide-react';
import { addDocument, updateDocument, orderBy } from '../../firebase/db';
import { provisionAccount, resetUserPassword } from '../../firebase/adminUsers';
import { useCollection } from '../../hooks/useCollection';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard } from '../../components';
import CredentialsBox from '../../components/CredentialsBox';

export default function AdminInvestors() {
  const { data: investors, loading } = useCollection('investors', [orderBy('createdAt', 'desc')]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const handleAdd = async (vals) => {
    setSaving(true);
    try {
      const { uid, login, password } = await provisionAccount(vals.name, 'investor');
      await addDocument('investors', {
        name: vals.name, contact: vals.contact ?? '', note: vals.note ?? '',
        uid, login, password,
      });
      form.resetFields();
      setOpen(false);
      message.success('Инвестор создан, доступ выдан');
    } catch (e) {
      message.error('Ошибка: ' + (e.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  // Выдать доступ инвестору, у которого ещё нет логина
  const handleGrant = async (inv) => {
    setBusyId(inv.id);
    try {
      const { uid, login, password } = await provisionAccount(inv.name, 'investor');
      await updateDocument('investors', inv.id, { uid, login, password });
      message.success('Доступ выдан');
    } catch (e) {
      message.error('Ошибка: ' + (e.message ?? e));
    } finally {
      setBusyId(null);
    }
  };

  // Сбросить пароль (нужны сохранённые login + текущий password)
  const handleReset = (inv) => {
    Modal.confirm({
      title: `Сбросить пароль для «${inv.name}»?`,
      content: 'Будет сгенерирован новый пароль. Старый перестанет работать.',
      okText: 'Сбросить', cancelText: 'Отмена', centered: true,
      onOk: async () => {
        setBusyId(inv.id);
        try {
          const newPassword = await resetUserPassword({ email: inv.login, oldPassword: inv.password });
          await updateDocument('investors', inv.id, { password: newPassword });
          message.success('Пароль сброшен');
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
      <PageHeader title="Инвесторы" eyebrow="Админ"
        right={
          <button onClick={() => setOpen(true)}
            style={{ width:40,height:40,borderRadius:12,display:'grid',placeItems:'center',background:'var(--glass)',border:'1px solid var(--line)',color:'var(--txt-mid)',cursor:'pointer' }}>
            <Plus size={20} strokeWidth={2} />
          </button>
        }
      />
      <div className="page-scroll">
        {investors.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--txt-lo)' }}>
            <Layers size={40} strokeWidth={1} style={{ marginBottom: 12, opacity: .4 }} />
            <div style={{ fontSize: 14 }}>Инвесторов ещё нет</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Нажмите + чтобы добавить</div>
          </div>
        )}

        {investors.map(inv => (
          <GlassCard key={inv.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 16, color: 'var(--gold-lite)',
                background: 'var(--navy-700)', border: '1px solid var(--line-gold)', flexShrink: 0,
              }}>
                {inv.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{inv.name}</div>
                {inv.contact && <div className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>{inv.contact}</div>}
                {!inv.login && <div style={{ fontSize: 11, color: 'var(--txt-faint)', marginTop: 3 }}>доступ не выдан</div>}
              </div>
            </div>

            {/* Учётные данные */}
            {inv.login && inv.password && (
              <div style={{ marginTop: 12 }}>
                <CredentialsBox login={inv.login} password={inv.password} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {inv.login ? (
                <button onClick={() => handleReset(inv)} disabled={busyId === inv.id || !inv.password}
                  style={accessBtn(busyId === inv.id || !inv.password)}>
                  <RefreshCw size={14} strokeWidth={1.8} />
                  {busyId === inv.id ? 'Сброс...' : 'Сбросить пароль'}
                </button>
              ) : (
                <button onClick={() => handleGrant(inv)} disabled={busyId === inv.id}
                  style={accessBtn(busyId === inv.id)}>
                  <KeyRound size={14} strokeWidth={1.8} />
                  {busyId === inv.id ? 'Создание...' : 'Выдать доступ'}
                </button>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Форма добавления */}
      <Modal
        open={open} onCancel={() => setOpen(false)} footer={null}
        title={<span style={{ color: 'var(--txt-hi)' }}>Добавить инвестора</span>}
      >
        <Form form={form} layout="vertical" onFinish={handleAdd} style={{ marginTop: 16 }}>
          <Form.Item label="Имя" name="name" rules={[{ required: true }]}>
            <Input size="large" placeholder="Виктор Поляков" />
          </Form.Item>
          <Form.Item label="Контакт (телефон / email)" name="contact">
            <Input size="large" placeholder="+7 916 ..." />
          </Form.Item>
          <Form.Item label="Заметка" name="note">
            <Input.TextArea rows={2} placeholder="Условия сотрудничества..." />
          </Form.Item>
          <div style={{ fontSize: 11.5, color: 'var(--txt-lo)', marginBottom: 14 }}>
            Логин и пароль для входа сгенерируются автоматически.
          </div>
          <Button type="primary" htmlType="submit" block size="large" loading={saving}
            style={{ background:'linear-gradient(145deg,#E6CD8C,#CBA45A)', border:'none', color:'#2A2008', fontWeight:600 }}>
            Создать и выдать доступ
          </Button>
        </Form>
      </Modal>
    </div>
  );
}

function accessBtn(disabled) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    fontSize: 12, fontWeight: 600, padding: '8px 13px', borderRadius: 10,
    background: 'var(--glass)', border: '1px solid var(--line)',
    color: disabled ? 'var(--txt-faint)' : 'var(--txt-mid)',
    cursor: disabled ? 'default' : 'pointer',
  };
}
