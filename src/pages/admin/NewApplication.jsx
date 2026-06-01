import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, InputNumber, Select, DatePicker, Button, Segmented, message, Divider, Modal } from 'antd';
import { UserPlus, Save } from 'lucide-react';
import { AddressSuggestions } from 'react-dadata';
import 'react-dadata/dist/react-dadata.css';
import {
  addDocument, getOwnedClients, getOwnedInvestors, addDoc, collection,
  getDocument, updateDocument,
} from '../../firebase/db';
import { db } from '../../firebase/config';
import { provisionAccount } from '../../firebase/adminUsers';
import { useAuth } from '../../context/AuthContext';
import { checkLimit } from '../../lib/limits';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard } from '../../components';
import { fmt, computeSchedule } from '../../lib/format';
import { usePaymentSchedule } from '../../hooks/usePaymentSchedule';
import dayjs from 'dayjs';

const DADATA_TOKEN = import.meta.env.VITE_DADATA_TOKEN ?? '';
const TERMS = [3, 6, 9, 12];

function lsKey(ownerId) { return `taksit:appdraft:${ownerId}`; }

export default function NewApplication() {
  const nav = useNavigate();
  const { draftId: paramDraftId } = useParams();
  const { ownerId } = useAuth();
  const [form] = Form.useForm();
  const [clients, setClients] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);

  // live preview state
  const [amount,  setAmount]  = useState(200000);
  const [downPayment, setDownPayment] = useState(0);
  const [term,    setTerm]    = useState(6);
  const [percent, setPercent] = useState(12);
  const [address, setAddress] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  const { total, monthly, payments } = usePaymentSchedule(amount, term, percent, undefined, downPayment);
  const financed = Math.max(0, amount - (downPayment || 0));

  // new-client modal
  const [clientModal, setClientModal] = useState(false);
  const [clientSelectOpen, setClientSelectOpen] = useState(false);
  const [newClientAddress, setNewClientAddress] = useState('');
  const [clientForm] = Form.useForm();
  const [savingClient, setSavingClient] = useState(false);

  // draft tracking
  const draftIdRef = useRef(paramDraftId ?? null);
  const finalizedRef = useRef(false);
  const dirtyRef = useRef(false);

  // ── load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ownerId) return;

    const init = async () => {
      const [c, i] = await Promise.all([getOwnedClients(ownerId), getOwnedInvestors(ownerId)]);
      setClients(c); setInvestors(i);

      if (paramDraftId) {
        // Load existing draft
        const draft = await getDocument('applications', paramDraftId);
        if (draft && draft.status === 'draft') {
          populateFromDraft(draft);
        }
      } else {
        // Restore from localStorage
        const saved = localStorage.getItem(lsKey(ownerId));
        if (saved) {
          try {
            const { fields, address: savedAddr } = JSON.parse(saved);
            if (fields) {
              const fv = { ...fields };
              if (fv.fundedFromDate) fv.fundedFromDate = dayjs(fv.fundedFromDate).isValid() ? dayjs(fv.fundedFromDate) : null;
              form.setFieldsValue(fv);
              if (fv.amount) setAmount(fv.amount);
              if (fv.downPayment != null) setDownPayment(fv.downPayment);
              if (fv.term) setTerm(fv.term);
              if (fv.percent) setPercent(fv.percent);
              if (savedAddr) setAddress(savedAddr);
              message.info('Восстановлен черновик формы', 3);
              dirtyRef.current = true;
            }
          } catch { /* ignore */ }
        }
      }
    };
    init();
  }, [ownerId]);

  const populateFromDraft = (draft) => {
    const fv = {
      clientId:    draft.clientId ?? undefined,
      investorId:  draft.investorId ?? undefined,
      product:     draft.product ?? '',
      amount:      draft.amount ?? 200000,
      downPayment: draft.downPayment ?? 0,
      term:        draft.term ?? 6,
      percent:     draft.percent ?? 12,
      phone:       draft.phone ?? '',
      fundedFromDate: draft.fundedFromDate
        ? (dayjs(draft.fundedFromDate).isValid() ? dayjs(draft.fundedFromDate) : null)
        : null,
    };
    form.setFieldsValue(fv);
    if (draft.amount) setAmount(draft.amount);
    if (draft.downPayment != null) setDownPayment(draft.downPayment);
    if (draft.term) setTerm(draft.term);
    if (draft.percent) setPercent(draft.percent);
    if (draft.address) setAddress(draft.address);
    dirtyRef.current = true;
  };

  // ── save draft to Firestore ───────────────────────────────────────────────
  const saveDraft = useCallback(async (silent = false) => {
    if (!ownerId) return null;
    const fields = form.getFieldsValue();
    const isMeaningful = fields.clientId || fields.product || (fields.amount && fields.amount !== 200000);
    if (!isMeaningful) return null;

    if (!silent) setDraftSaving(true);
    try {
      const payload = {
        clientId:      fields.clientId ?? null,
        investorId:    fields.investorId ?? null,
        product:       fields.product ?? '',
        amount:        fields.amount ?? 0,
        downPayment:   fields.downPayment ?? 0,
        term:          fields.term ?? 6,
        percent:       fields.percent ?? 12,
        phone:         fields.phone ?? '',
        address:       address,
        fundedFromDate: fields.fundedFromDate?.toISOString?.() ?? null,
        status:        'draft',
        ownerId,
        deleted:       false,
      };

      if (draftIdRef.current) {
        await updateDocument('applications', draftIdRef.current, payload);
        return draftIdRef.current;
      } else {
        const ref = await addDocument('applications', payload);
        draftIdRef.current = ref.id;
        return ref.id;
      }
    } catch (e) {
      if (!silent) message.error('Ошибка сохранения черновика: ' + e.message);
      return null;
    } finally {
      if (!silent) setDraftSaving(false);
    }
  }, [ownerId, address, form]);

  // ── auto-save to localStorage on every change ─────────────────────────────
  const persistToStorage = useCallback(() => {
    if (!ownerId) return;
    const fields = form.getFieldsValue();
    const serializable = { ...fields };
    if (serializable.fundedFromDate?.toISOString) {
      serializable.fundedFromDate = serializable.fundedFromDate.toISOString();
    } else if (serializable.fundedFromDate?.$d) {
      serializable.fundedFromDate = new Date(serializable.fundedFromDate.$d).toISOString();
    }
    try {
      localStorage.setItem(lsKey(ownerId), JSON.stringify({ fields: serializable, address }));
    } catch { /* ignore */ }
  }, [ownerId, address, form]);

  // ── cleanup: auto-draft on SPA navigation away ───────────────────────────
  useEffect(() => {
    return () => {
      if (!finalizedRef.current && dirtyRef.current) {
        saveDraft(true);
      }
    };
  }, [saveDraft]);

  // beforeunload for hard refresh/close (best-effort, localStorage is the real safety net)
  useEffect(() => {
    const handler = (e) => {
      if (dirtyRef.current && !finalizedRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // ── client ────────────────────────────────────────────────────────────────
  const onClientSelect = (clientId) => {
    const c = clients.find(x => x.id === clientId);
    if (!c) return;
    setSelectedClient(c);
    setAddress(c.address ?? '');
    form.setFieldsValue({ phone: c.phone ?? '' });
  };

  const saveNewClient = async () => {
    const vals = await clientForm.validateFields();
    const limit = await checkLimit(ownerId, 'clients');
    if (!limit.ok) {
      message.warning(`Достигнут лимит клиентов (${limit.limit}). Купите пакет в разделе «Подписка».`);
      return;
    }
    setSavingClient(true);
    try {
      const addr = newClientAddress || '';
      const { uid, login, password } = await provisionAccount(vals.name, 'client', { ownerId });
      const ref = await addDocument('clients', {
        name:    vals.name,
        phone:   vals.phone ?? '',
        address: addr,
        uid, login, password,
        ownerId, deleted: false,
        documents: [],
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

  // ── save as draft manually ────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    const id = await saveDraft(false);
    if (id) {
      localStorage.removeItem(lsKey(ownerId));
      finalizedRef.current = true;
      message.success('Черновик сохранён');
      nav('/admin/apps');
    }
  };

  // ── final submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (vals) => {
    if (!address) { message.warning('Введите адрес'); return; }
    const limit = await checkLimit(ownerId, 'applications');
    if (!limit.ok) {
      message.warning(`Достигнут лимит заявок (${limit.limit}). Купите пакет в разделе «Подписка».`);
      return;
    }
    setLoading(true);
    try {
      const { payments: sched, total: tot, monthly: mon } = computeSchedule(
        vals.amount, vals.term, vals.percent,
        vals.fundedFromDate?.toDate?.() ?? new Date(),
        vals.downPayment ?? 0,
      );
      const payload = {
        clientId:       vals.clientId,
        investorId:     vals.investorId,
        product:        vals.product,
        category:       vals.category ?? '',
        amount:         vals.amount,
        downPayment:    vals.downPayment ?? 0,
        term:           vals.term,
        percent:        vals.percent,
        address:        address,
        fundedFromDate: vals.fundedFromDate?.toISOString?.() ?? new Date().toISOString(),
        total:          tot,
        monthly:        mon,
        paidCount:      0,
        status:         'active',
        ownerId,
        deleted:        false,
        documents:      [],
      };

      let appId;
      if (draftIdRef.current) {
        await updateDocument('applications', draftIdRef.current, payload);
        appId = draftIdRef.current;
        // delete any existing payments for the draft (there shouldn't be any, but just in case)
      } else {
        const ref = await addDocument('applications', payload);
        appId = ref.id;
      }

      // Create payment schedule
      for (const p of sched) {
        await addDoc(collection(db, `applications/${appId}/payments`), p);
      }

      localStorage.removeItem(lsKey(ownerId));
      finalizedRef.current = true;
      message.success('Заявка создана!');
      nav('/admin/apps/' + appId);
    } catch (e) {
      console.error(e);
      message.error('Ошибка при создании заявки');
    } finally {
      setLoading(false);
    }
  };

  const onValuesChange = (_, all) => {
    dirtyRef.current = true;
    if (all.amount)             setAmount(all.amount);
    if (all.downPayment != null) setDownPayment(all.downPayment);
    if (all.term)               setTerm(all.term);
    if (all.percent)            setPercent(all.percent);
    persistToStorage();
  };

  const previewRows = payments.slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title={paramDraftId ? 'Черновик заявки' : 'Новая заявка'} eyebrow="Шаг 1 из 1" onBack={() => nav(-1)} />
      <div className="page-scroll">
        <Form form={form} layout="vertical" onFinish={handleSubmit} onValuesChange={onValuesChange}>

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

          <Form.Item label="Адрес" help={null}>
            <AddressSuggestions
              key={selectedClient?.id ?? 'none'}
              token={DADATA_TOKEN}
              value={{ value: address }}
              onChange={(s) => { setAddress(s?.value ?? ''); dirtyRef.current = true; persistToStorage(); }}
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

          <Form.Item label="Первоначальный взнос (₽)" name="downPayment" initialValue={0}
            extra="Наценка начисляется на остаток (сумма минус взнос)"
            rules={[({ getFieldValue }) => ({
              validator(_, value) {
                if (value == null || value < (getFieldValue('amount') ?? 0)) return Promise.resolve();
                return Promise.reject(new Error('Взнос должен быть меньше суммы рассрочки'));
              },
            })]}>
            <InputNumber size="large" style={{ width: '100%' }} min={0}
              formatter={v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={v => v.replace(/\s/g, '')}
            />
          </Form.Item>

          <Form.Item label="Процент рассрочки (%)" name="percent" initialValue={12} rules={[{ required: true }]}>
            <InputNumber size="large" style={{ width: '100%' }} min={1} max={100} addonAfter="%" />
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
              {downPayment > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 11.5 }}>
                  <span className="faint">Взнос {fmt(downPayment)} · финансируется</span>
                  <span className="num" style={{ color: 'var(--gold-lite)' }}>{fmt(financed)}</span>
                </div>
              )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderTop: '1px solid var(--line)', fontSize: 11.5 }}>
                  <span className="faint">+ ещё {term - 3} платежей</span>
                  <span className="faint">до {payments[term - 1]?.date}</span>
                </div>
              )}
            </GlassCard>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button type="button" onClick={handleSaveDraft} disabled={draftSaving}
              style={{
                flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '14px 13px', borderRadius: 13, cursor: draftSaving ? 'default' : 'pointer',
                fontSize: 13, fontWeight: 600,
                background: 'var(--glass)', border: '1px solid var(--line)',
                color: draftSaving ? 'var(--txt-faint)' : 'var(--txt-mid)',
              }}>
              <Save size={15} strokeWidth={2} />
              {draftSaving ? 'Сохранение...' : 'Черновик'}
            </button>

            <Button type="primary" htmlType="submit" size="large" loading={loading}
              style={{
                flex: 2, background: 'linear-gradient(145deg,#E6CD8C,#CBA45A)', border: 'none',
                color: '#2A2008', fontWeight: 600, height: 52,
              }}>
              Создать заявку →
            </Button>
          </div>
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
