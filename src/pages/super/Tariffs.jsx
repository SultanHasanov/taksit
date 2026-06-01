import { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Modal, Switch, message, Skeleton, Segmented } from 'antd';
import { Plus, Pencil } from 'lucide-react';
import { getCollection, addDocument, updateDocument } from '../../firebase/db';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard, KV, Divider } from '../../components';
import { fmt } from '../../lib/format';

const TARGET_LABELS = { clients: 'Клиенты', investors: 'Инвесторы', applications: 'Заявки' };

export default function SuperTariffs() {
  const [loading, setLoading] = useState(true);
  const [tariffs, setTariffs] = useState([]);
  const [addons, setAddons] = useState([]);
  const [tab, setTab] = useState('tariffs');

  const [tariffModal, setTariffModal] = useState(false);
  const [addonModal, setAddonModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tForm] = Form.useForm();
  const [aForm] = Form.useForm();

  const load = () => Promise.all([getCollection('tariffs'), getCollection('addons')])
    .then(([t, a]) => {
      setTariffs(t.sort((x, y) => (x.order ?? 0) - (y.order ?? 0)));
      setAddons(a);
      setLoading(false);
    });
  useEffect(() => { load(); }, []);

  const openTariff = (t) => {
    setEditing(t);
    tForm.setFieldsValue(t ? {
      name: t.name, monthlyPrice: t.monthlyPrice, order: t.order,
      maxClients: t.limits?.maxClients ?? 0, maxInvestors: t.limits?.maxInvestors ?? 0,
      maxApplications: t.limits?.maxApplications ?? 0,
      features: (t.features ?? []).join('\n'), active: t.active !== false,
    } : { active: true, order: tariffs.length + 1, maxClients: 0, maxInvestors: 0, maxApplications: 0 });
    setTariffModal(true);
  };

  const saveTariff = async () => {
    const v = await tForm.validateFields();
    setSaving(true);
    try {
      const data = {
        name: v.name, monthlyPrice: v.monthlyPrice, order: v.order ?? 0, active: v.active,
        limits: { maxClients: v.maxClients ?? 0, maxInvestors: v.maxInvestors ?? 0, maxApplications: v.maxApplications ?? 0 },
        features: String(v.features ?? '').split('\n').map(s => s.trim()).filter(Boolean),
      };
      if (editing) await updateDocument('tariffs', editing.id, data);
      else await addDocument('tariffs', data);
      message.success('Тариф сохранён');
      setTariffModal(false); tForm.resetFields(); load();
    } catch (e) { message.error('Ошибка: ' + (e.message ?? e)); }
    finally { setSaving(false); }
  };

  const openAddon = (a) => {
    setEditing(a);
    aForm.setFieldsValue(a ? { name: a.name, target: a.target, extra: a.extra, price: a.price, active: a.active !== false }
      : { target: 'clients', active: true });
    setAddonModal(true);
  };

  const saveAddon = async () => {
    const v = await aForm.validateFields();
    setSaving(true);
    try {
      const data = { name: v.name, target: v.target, extra: v.extra, price: v.price, active: v.active };
      if (editing) await updateDocument('addons', editing.id, data);
      else await addDocument('addons', data);
      message.success('Пакет сохранён');
      setAddonModal(false); aForm.resetFields(); load();
    } catch (e) { message.error('Ошибка: ' + (e.message ?? e)); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 20 }}><Skeleton active /></div>;

  const lim = (n) => n === 0 ? '∞' : n;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="Тарифы" eyebrow="Платформа"
        right={
          <button onClick={() => tab === 'tariffs' ? openTariff(null) : openAddon(null)}
            style={{ width:40,height:40,borderRadius:12,display:'grid',placeItems:'center',background:'var(--glass)',border:'1px solid var(--line)',color:'var(--txt-mid)',cursor:'pointer' }}>
            <Plus size={20} strokeWidth={2} />
          </button>
        }
      />
      <div className="page-scroll">
        <Segmented block value={tab} onChange={setTab} style={{ marginBottom: 16 }}
          options={[{ label: 'Тарифы', value: 'tariffs' }, { label: 'Пакеты', value: 'addons' }]} />

        {tab === 'tariffs' && (
          <div className="grid-list">
            {tariffs.map(t => (
              <GlassCard key={t.id} gold={t.active !== false} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div className="h-title" style={{ fontSize: 16 }}>{t.name}</div>
                    <div className="num" style={{ fontSize: 18, color: 'var(--gold-lite)', marginTop: 2 }}>{fmt(t.monthlyPrice)}<span className="faint" style={{ fontSize: 11 }}> /мес</span></div>
                  </div>
                  <button onClick={() => openTariff(t)} style={iconBtn}><Pencil size={15} strokeWidth={1.8} /></button>
                </div>
                <KV k="Клиенты" v={lim(t.limits?.maxClients ?? 0)} />
                <KV k="Инвесторы" v={lim(t.limits?.maxInvestors ?? 0)} />
                <KV k="Заявки" v={lim(t.limits?.maxApplications ?? 0)} />
                {(t.features ?? []).length > 0 && (
                  <>
                    <Divider style={{ margin: '8px 0' }} />
                    {t.features.map((f, i) => (
                      <div key={i} className="faint" style={{ fontSize: 12, padding: '2px 0' }}>· {f}</div>
                    ))}
                  </>
                )}
                {t.active === false && <div style={{ fontSize: 11, color: 'var(--txt-lo)', marginTop: 8 }}>Скрыт</div>}
              </GlassCard>
            ))}
          </div>
        )}

        {tab === 'addons' && (
          <div className="grid-list">
            {addons.map(a => (
              <GlassCard key={a.id} style={{ marginBottom: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                    <div className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>
                      +{a.extra} · {TARGET_LABELS[a.target]} · {fmt(a.price)}
                    </div>
                  </div>
                  <button onClick={() => openAddon(a)} style={iconBtn}><Pencil size={15} strokeWidth={1.8} /></button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Tariff modal */}
      <Modal open={tariffModal} title={editing ? 'Редактировать тариф' : 'Новый тариф'}
        okText="Сохранить" cancelText="Отмена" confirmLoading={saving} onOk={saveTariff}
        onCancel={() => { setTariffModal(false); tForm.resetFields(); }} centered>
        <Form form={tForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="Название" name="name" rules={[{ required: true }]}>
            <Input size="large" placeholder="Стандарт" />
          </Form.Item>
          <Form.Item label="Цена в месяц (₽)" name="monthlyPrice" rules={[{ required: true }]}>
            <InputNumber size="large" style={{ width: '100%' }} min={0}
              formatter={v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={v => v.replace(/\s/g, '')} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 10 }}>
            <Form.Item label="Лимит клиентов" name="maxClients" style={{ flex: 1 }} extra="0 = безлимит">
              <InputNumber size="large" style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item label="Лимит инвесторов" name="maxInvestors" style={{ flex: 1 }} extra="0 = безлимит">
              <InputNumber size="large" style={{ width: '100%' }} min={0} />
            </Form.Item>
          </div>
          <Form.Item label="Лимит заявок" name="maxApplications" extra="0 = безлимит">
            <InputNumber size="large" style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item label="Возможности (по строке на пункт)" name="features">
            <Input.TextArea rows={4} placeholder={'До 50 клиентов\nРасширенные отчёты'} />
          </Form.Item>
          <Form.Item label="Порядок" name="order">
            <InputNumber size="large" style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item label="Активен" name="active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Addon modal */}
      <Modal open={addonModal} title={editing ? 'Редактировать пакет' : 'Новый пакет'}
        okText="Сохранить" cancelText="Отмена" confirmLoading={saving} onOk={saveAddon}
        onCancel={() => { setAddonModal(false); aForm.resetFields(); }} centered>
        <Form form={aForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="Название" name="name" rules={[{ required: true }]}>
            <Input size="large" placeholder="+10 клиентов" />
          </Form.Item>
          <Form.Item label="Что расширяет" name="target" rules={[{ required: true }]}>
            <Segmented block options={[
              { label: 'Клиенты', value: 'clients' },
              { label: 'Инвесторы', value: 'investors' },
              { label: 'Заявки', value: 'applications' },
            ]} />
          </Form.Item>
          <Form.Item label="+ к лимиту" name="extra" rules={[{ required: true }]}>
            <InputNumber size="large" style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item label="Цена (₽)" name="price" rules={[{ required: true }]}>
            <InputNumber size="large" style={{ width: '100%' }} min={0}
              formatter={v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={v => v.replace(/\s/g, '')} />
          </Form.Item>
          <Form.Item label="Активен" name="active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

const iconBtn = {
  width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center',
  background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--txt-mid)', cursor: 'pointer', flexShrink: 0,
};
