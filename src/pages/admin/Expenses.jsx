import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Button, Modal, message, Empty } from 'antd';
import { Plus, Wallet } from 'lucide-react';
import { addDocument, getExpenses, getOwnedInvestors } from '../../firebase/db';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard } from '../../components';
import { fmt, fmtDate, dayjs } from '../../lib/format';

export default function AdminExpenses() {
  const { ownerId } = useAuth();
  const [investors, setInvestors] = useState([]);
  useEffect(() => {
    if (!ownerId) return;
    getOwnedInvestors(ownerId).then(setInvestors);
  }, [ownerId]);
  const [selectedInvestorId, setSelectedInvestorId] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedInvestorId) return;
    setLoading(true);
    getExpenses(selectedInvestorId).then(e => { setExpenses(e); setLoading(false); });
  }, [selectedInvestorId]);

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);

  const handleAdd = async (vals) => {
    if (!selectedInvestorId) { message.warning('Выберите инвестора'); return; }
    setSaving(true);
    try {
      await addDocument('expenses', {
        investorId: selectedInvestorId,
        title:  vals.title,
        amount: vals.amount,
        date:   vals.date?.toISOString?.() ?? new Date().toISOString(),
        note:   vals.note ?? '',
        ownerId, deleted: false,
      });
      const updated = await getExpenses(selectedInvestorId);
      setExpenses(updated);
      form.resetFields();
      setOpen(false);
      message.success('Расход добавлен');
    } catch {
      message.error('Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="Расходы" eyebrow="Админ"
        right={selectedInvestorId && (
          <button onClick={() => setOpen(true)}
            style={{ width:40,height:40,borderRadius:12,display:'grid',placeItems:'center',background:'var(--glass)',border:'1px solid var(--line)',color:'var(--txt-mid)',cursor:'pointer' }}>
            <Plus size={20} strokeWidth={2} />
          </button>
        )}
      />
      <div className="page-scroll">
        {/* Investor selector */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11.5, color: 'var(--txt-mid)', fontWeight: 600, marginBottom: 8 }}>Инвестор</div>
          <Select
            size="large" style={{ width: '100%' }}
            placeholder="Выберите инвестора"
            value={selectedInvestorId}
            onChange={setSelectedInvestorId}
            options={investors.map(i => ({ value: i.id, label: i.name }))}
          />
        </div>

        {selectedInvestorId && (
          <>
            {/* Total */}
            <GlassCard gold style={{ marginBottom: 16 }}>
              <div className="faint" style={{ fontSize: 11 }}>Итого расходов по инвестору</div>
              <div className="num" style={{ fontSize: 28, fontWeight: 600, margin: '8px 0 4px', color: 'var(--bad)' }}>
                {fmt(totalExpenses)}
              </div>
              <div className="faint" style={{ fontSize: 11.5 }}>{expenses.length} позиций</div>
            </GlassCard>

            {/* Expenses list */}
            {expenses.length === 0 && !loading && (
              <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--txt-lo)' }}>
                <Wallet size={36} strokeWidth={1} style={{ opacity: .4, marginBottom: 10 }} />
                <div>Расходов ещё нет</div>
              </div>
            )}

            {expenses.map(e => (
              <GlassCard key={e.id} style={{ marginBottom: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{e.title}</div>
                    {e.note && <div className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>{e.note}</div>}
                    <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>
                      {e.date ? fmtDate(e.date) : '—'}
                    </div>
                  </div>
                  <div className="num" style={{ fontSize: 16, color: 'var(--bad)', flexShrink: 0 }}>
                    −{fmt(e.amount)}
                  </div>
                </div>
              </GlassCard>
            ))}
          </>
        )}

        {!selectedInvestorId && (
          <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--txt-lo)', fontSize: 14 }}>
            Выберите инвестора для просмотра расходов
          </div>
        )}
      </div>

      <Modal
        open={open} onCancel={() => setOpen(false)} footer={null}
        title={<span style={{ color: 'var(--txt-hi)' }}>Добавить расход</span>}
      >
        <Form form={form} layout="vertical" onFinish={handleAdd} style={{ marginTop: 16 }}>
          <Form.Item label="Статья расхода" name="title" rules={[{ required: true }]}>
            <Input size="large" placeholder="Бензин, обед, аренда..." />
          </Form.Item>
          <Form.Item label="Сумма (₽)" name="amount" rules={[{ required: true }]}>
            <InputNumber size="large" style={{ width: '100%' }} min={1}
              formatter={v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={v => v.replace(/\s/g, '')}
            />
          </Form.Item>
          <Form.Item label="Дата" name="date" rules={[{ required: true }]}
            initialValue={dayjs()}>
            <DatePicker size="large" style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item label="Заметка" name="note">
            <Input size="large" placeholder="Необязательно" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={saving}
            style={{ background:'linear-gradient(145deg,#E6CD8C,#CBA45A)', border:'none', color:'#2A2008', fontWeight:600 }}>
            Сохранить
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
