import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, InputNumber, Select, DatePicker, Button, Segmented, message, Divider, Modal } from 'antd';
import { UserPlus } from 'lucide-react';
import { AddressSuggestions } from 'react-dadata';
import 'react-dadata/dist/react-dadata.css';
import { addDocument, getClients, getInvestors, addDoc, collection } from '../../firebase/db';
import { db } from '../../firebase/config';
import { provisionAccount } from '../../firebase/adminUsers';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard } from '../../components';
import { fmt, computeSchedule } from '../../lib/format';
import { usePaymentSchedule } from '../../hooks/usePaymentSchedule';
import dayjs from 'dayjs';

const DADATA_TOKEN = import.meta.env.VITE_DADATA_TOKEN ?? '';

const TERMS = [3, 6, 9, 12];

export default function NewApplication() {
  const nav = useNavigate();
  const [form] = Form.useForm();
  const [clients, setClients] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(false);

  // live preview state
  const [amount,  setAmount]  = useState(200000);
  const [term,    setTerm]    = useState(6);
  const [percent, setPercent] = useState(12);
  const [address, setAddress] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  const { total, monthly, payments } = usePaymentSchedule(amount, term, percent);

  // new-client modal
  const [clientModal, setClientModal] = useState(false);
  const [clientSelectOpen, setClientSelectOpen] = useState(false);
  const [newClientAddress, setNewClientAddress] = useState('');
  const [clientForm] = Form.useForm();
  const [savingClient, setSavingClient] = useState(false);

  useEffect(() => {
    Promise.all([getClients(), getInvestors()]).then(([c, i]) => {
      setClients(c); setInvestors(i);
    });
  }, []);

  const onClientSelect = (clientId) => {
    const c = clients.find(x => x.id === clientId);
    if (!c) return;
    setSelectedClient(c);
    setAddress(c.address ?? '');
    form.setFieldsValue({ phone: c.phone ?? '' });
  };

  const saveNewClient = async () => {
    const vals = await clientForm.validateFields();
    setSavingClient(true);
    try {
      const addr = newClientAddress || '';
      // создаём аккаунт клиента (логин+пароль) — админ не вылетает из сессии
      const { uid, login, password } = await provisionAccount(vals.name, 'client');
      const ref = await addDocument('clients', {
        name:    vals.name,
        phone:   vals.phone ?? '',
        address: addr,
        uid, login, password,
      });
      const newClient = { id: ref.id, name: vals.name, phone: vals.phone ?? '', address: addr, uid, login, password };
      setClients(prev => [newClient, ...prev]);
      setSelectedClient(newClient);
      form.setFieldValue('clientId', ref.id);
      setAddress(addr);
      form.setFieldsValue({ phone: vals.phone ?? '' });
      clientForm.resetFields();
      setNewClientAddress('');
      setClientModal(false);
      message.success(`Клиент «${vals.name}» добавлен, доступ выдан`);
    } catch (e) {
      message.error('Ошибка: ' + e.message);
    } finally {
      setSavingClient(false);
    }
  };

  const handleSubmit = async (vals) => {
    if (!address) { message.warning('Введите адрес'); return; }
    setLoading(true);
    try {
      const { payments: sched, total: tot, monthly: mon } = computeSchedule(
        vals.amount, vals.term, vals.percent,
        vals.fundedFromDate?.toDate?.() ?? new Date(),
      );
      const ref = await addDocument('applications', {
        clientId:       vals.clientId,
        investorId:     vals.investorId,
        product:        vals.product,
        category:       vals.category ?? '',
        amount:         vals.amount,
        term:           vals.term,
        percent:        vals.percent,
        address:        address,
        fundedFromDate: vals.fundedFromDate?.toISOString?.() ?? new Date().toISOString(),
        total:          tot,
        monthly:        mon,
        paidCount:      0,
        status:         'active',
      });
      // add payment schedule
      for (const p of sched) {
        await addDoc(collection(db, `applications/${ref.id}/payments`), p);
      }
      message.success('Заявка создана!');
      nav('/admin/apps');
    } catch (e) {
      console.error(e);
      message.error('Ошибка при создании заявки');
    } finally {
      setLoading(false);
    }
  };

  const previewRows = payments.slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="Новая заявка" eyebrow="Шаг 1 из 1" onBack={() => nav(-1)} />
      <div className="page-scroll">
        <Form form={form} layout="vertical" onFinish={handleSubmit}
          onValuesChange={(_, all) => {
            if (all.amount)  setAmount(all.amount);
            if (all.term)    setTerm(all.term);
            if (all.percent) setPercent(all.percent);
          }}>

          {/* Client */}
          <div className="eyebrow" style={{ marginBottom: 12 }}>Клиент</div>
          <Form.Item label="Клиент" name="clientId" rules={[{ required: true }]}>
            <Select size="large" placeholder="Выберите клиента"
              options={clients.map(c => ({ value: c.id, label: c.name }))}
              showSearch filterOption={(v, o) => o.label.toLowerCase().includes(v.toLowerCase())}
              open={clientSelectOpen}
              onDropdownVisibleChange={setClientSelectOpen}
              onSelect={onClientSelect}
              dropdownRender={menu => (
                <>
                  <div
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { setClientSelectOpen(false); setClientModal(true); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 14px', cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
                      color: 'var(--gold-lite)', borderBottom: '1px solid rgba(255,255,255,.07)',
                    }}
                  >
                    <UserPlus size={15} strokeWidth={2} />
                    Добавить нового клиента
                  </div>
                  {menu}
                </>
              )}
            />
          </Form.Item>

          {/* Address via DaData — управляется стейтом напрямую, не через Form */}
          <Form.Item label="Адрес"
            validateStatus={address === '' ? undefined : undefined}
            help={null}
          >
            <AddressSuggestions
              key={selectedClient?.id ?? 'none'}
              token={DADATA_TOKEN}
              value={{ value: address }}
              onChange={(s) => { setAddress(s?.value ?? ''); }}
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

          <Form.Item label="Телефон клиента" name="phone">
            <Input size="large" placeholder="+7 900 000 0000" />
          </Form.Item>

          <Divider style={{ borderColor: 'var(--line)', margin: '8px 0 16px' }} />

          {/* Product */}
          <div className="eyebrow" style={{ marginBottom: 12 }}>Товар / Услуга</div>
          <Form.Item label="Наименование" name="product" rules={[{ required: true }]}>
            <Input size="large" placeholder="Камера Sony A7 IV" />
          </Form.Item>

          <Divider style={{ borderColor: 'var(--line)', margin: '8px 0 16px' }} />

          {/* Conditions */}
          <div className="eyebrow" style={{ marginBottom: 12 }}>Условия</div>
          <Form.Item label="Сумма рассрочки (₽)" name="amount" initialValue={200000} rules={[{ required: true }]}>
            <InputNumber size="large" style={{ width: '100%' }} min={1000}
              formatter={v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={v => v.replace(/\s/g, '')}
            />
          </Form.Item>

          <Form.Item label="Процент рассрочки (%)" name="percent" initialValue={12} rules={[{ required: true }]}>
            <InputNumber size="large" style={{ width: '100%' }} min={1} max={100}
              addonAfter="%" />
          </Form.Item>

          <Form.Item label="Срок" name="term" initialValue={6}>
            <Segmented
              options={TERMS.map(t => ({ label: `${t} мес`, value: t }))}
              block style={{ fontWeight: 600 }}
              onChange={v => setTerm(v)}
            />
          </Form.Item>

          <Divider style={{ borderColor: 'var(--line)', margin: '8px 0 16px' }} />

          {/* Investor */}
          <div className="eyebrow" style={{ marginBottom: 12 }}>Инвестор</div>
          <Form.Item label="Инвестор" name="investorId" rules={[{ required: true, message: 'Выберите инвестора' }]}>
            <Select size="large" placeholder="Выберите инвестора"
              options={investors.map(i => ({ value: i.id, label: i.name }))} />
          </Form.Item>
          <Form.Item label="Дата передачи средств инвестором" name="fundedFromDate"
            rules={[{ required: true, message: 'Укажите дату' }]}>
            <DatePicker size="large" style={{ width: '100%' }} format="DD.MM.YYYY"
              placeholder="Выберите дату" />
          </Form.Item>

          {/* Preview */}
          {amount > 0 && term > 0 && percent > 0 && (
            <GlassCard gold style={{ margin: '18px 0 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div className="eyebrow">Превью графика</div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 7,
                  background: 'var(--gold-soft)', color: 'var(--gold-lite)',
                }}>{percent}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
                <div>
                  <div className="faint" style={{ fontSize: 11 }}>Ежемесячный платёж</div>
                  <div className="num" style={{ fontSize: 30, fontWeight: 600, color: 'var(--gold-lite)' }}>{fmt(monthly)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="faint" style={{ fontSize: 11 }}>Итого к возврату</div>
                  <div className="num" style={{ fontSize: 17 }}>{fmt(total)}</div>
                </div>
              </div>
              {previewRows.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 0', borderTop: '1px solid var(--line)', fontSize: 12.5,
                }}>
                  <span className="faint">{p.n}. {p.date}</span>
                  <span className="num" style={{ color: 'var(--txt-hi)' }}>{fmt(p.amount)}</span>
                </div>
              ))}
              {term > 3 && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '9px 0', borderTop: '1px solid var(--line)', fontSize: 11.5,
                }}>
                  <span className="faint">+ ещё {term - 3} платежей</span>
                  <span className="faint">до {payments[term - 1]?.date}</span>
                </div>
              )}
            </GlassCard>
          )}

          <Button type="primary" htmlType="submit" size="large" block loading={loading}
            style={{
              background: 'linear-gradient(145deg,#E6CD8C,#CBA45A)', border: 'none',
              color: '#2A2008', fontWeight: 600, height: 52,
            }}>
            Создать заявку →
          </Button>
        </Form>
      </div>
      {/* New client modal */}
      <Modal
        open={clientModal}
        title="Новый клиент"
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={savingClient}
        onOk={saveNewClient}
        onCancel={() => { setClientModal(false); clientForm.resetFields(); }}
        centered
      >
        <Form form={clientForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="ФИО" name="name" rules={[{ required: true, message: 'Введите имя' }]}>
            <Input size="large" placeholder="Иванов Иван Иванович" />
          </Form.Item>
          <Form.Item label="Телефон" name="phone">
            <Input size="large" placeholder="+7 900 000 0000" />
          </Form.Item>
          <Form.Item label="Адрес" name="clientAddress">
            <AddressSuggestions
              token={DADATA_TOKEN}
              value={{ value: newClientAddress }}
              onChange={(s) => {
                const v = s?.value ?? '';
                setNewClientAddress(v);
                clientForm.setFieldValue('clientAddress', v);
              }}
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
            Логин и пароль сгенерируются автоматически — их можно посмотреть в детали заявки.
          </div>
        </Form>
      </Modal>
    </div>
  );
}
