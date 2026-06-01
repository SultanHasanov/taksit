import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Skeleton, Modal, Select, DatePicker, InputNumber, message } from 'antd';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import {
  getDocument, getCollection, setDocument, updateDocument, addDocument, where,
} from '../../firebase/db';
import { resetUserPassword } from '../../firebase/adminUsers';
import { effectiveLimit } from '../../lib/limits';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard, KV, Divider } from '../../components';
import CredentialsBox from '../../components/CredentialsBox';
import { fmt, fmtDate, dayjs } from '../../lib/format';

export default function SuperAdminDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(null);
  const [sub, setSub] = useState(null);
  const [tariffs, setTariffs] = useState([]);
  const [addonDefs, setAddonDefs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [counts, setCounts] = useState({ clients: 0, investors: 0, applications: 0 });

  // confirm modal state
  const [confirmTarget, setConfirmTarget] = useState(null); // { kind:'tariff' } | { kind:'addon', addedAt, addonId, name, price }
  const [payDate, setPayDate] = useState(dayjs().add(1, 'month'));
  const [payAmount, setPayAmount] = useState(0);
  const [busy, setBusy] = useState(false);

  const [tariffOpen, setTariffOpen] = useState(false);
  const [newTariffId, setNewTariffId] = useState(null);

  const load = async () => {
    const [a, s, t, ads] = await Promise.all([
      getDocument('users', id),
      getDocument('subscriptions', id),
      getCollection('tariffs'),
      getCollection('addons'),
    ]);
    setAdmin(a); setSub(s);
    setTariffs(t.filter(x => x.active !== false).sort((x, y) => (x.order ?? 0) - (y.order ?? 0)));
    setAddonDefs(ads);
    const [pays, cl, inv, apps] = await Promise.all([
      getCollection('subscriptionPayments', [where('adminId', '==', id)]),
      getCollection('clients', [where('ownerId', '==', id)]),
      getCollection('investors', [where('ownerId', '==', id)]),
      getCollection('applications', [where('ownerId', '==', id)]),
    ]);
    setPayments(pays.sort((x, y) => String(y.paidAt ?? '').localeCompare(String(x.paidAt ?? ''))));
    setCounts({
      clients: cl.filter(r => !r.deleted).length,
      investors: inv.filter(r => !r.deleted).length,
      applications: apps.filter(r => !r.deleted).length,
    });
    setLoading(false);
  };

  useEffect(() => { if (id) load(); }, [id]);

  const tariff = tariffs.find(t => t.id === sub?.tariffId);

  const openConfirmTariff = () => {
    setPayAmount(tariff?.monthlyPrice ?? 0);
    setPayDate(
      dayjs(sub?.nextPaymentDate ?? undefined).isValid() && sub?.nextPaymentDate
        ? dayjs(sub.nextPaymentDate).add(1, 'month')
        : dayjs().add(1, 'month'),
    );
    setConfirmTarget({ kind: 'tariff' });
  };

  const openConfirmAddon = (addon) => {
    const def = addonDefs.find(d => d.id === addon.addonId);
    setPayAmount(def?.price ?? 0);
    setConfirmTarget({ kind: 'addon', addedAt: addon.addedAt, addonId: addon.addonId, name: def?.name ?? addon.addonId, price: def?.price ?? 0 });
  };

  const confirmPayment = async () => {
    if (!confirmTarget) return;
    setBusy(true);
    try {
      const freshSub = await getDocument('subscriptions', id);

      if (confirmTarget.kind === 'tariff') {
        const periodStart = dayjs().format('YYYY-MM-DD');
        const periodEnd = payDate.format('YYYY-MM-DD');
        const tariffName = tariff?.name ?? freshSub?.tariffId ?? '—';
        await addDocument('subscriptionPayments', {
          adminId: id,
          tariffId: freshSub?.tariffId ?? sub?.tariffId ?? null,
          kind: 'tariff',
          note: `Тариф: ${tariffName}`,
          amount: payAmount,
          paidAt: dayjs().toISOString(),
          periodStart,
          periodEnd,
          recordedBy: 'superadmin',
        });
        await setDocument('subscriptions', id, {
          status: 'active',
          nextPaymentDate: periodEnd,
          purchasedAddons: freshSub?.purchasedAddons ?? sub?.purchasedAddons ?? [],
        });
        message.success('Тариф подтверждён и активирован.');

      } else {
        // addon
        const addons = [...(freshSub?.purchasedAddons ?? sub?.purchasedAddons ?? [])];
        // find by addedAt first, fallback to first pending with same addonId
        let idx = addons.findIndex(a => a.addedAt === confirmTarget.addedAt && a.addonId === confirmTarget.addonId);
        if (idx === -1) idx = addons.findIndex(a => a.addonId === confirmTarget.addonId && (a.status ?? 'active') === 'pending');
        if (idx !== -1) addons[idx] = { ...addons[idx], status: 'active' };
        await addDocument('subscriptionPayments', {
          adminId: id,
          addonId: confirmTarget.addonId,
          kind: 'addon',
          note: `Пакет: ${confirmTarget.name}`,
          amount: payAmount,
          paidAt: dayjs().toISOString(),
          recordedBy: 'superadmin',
        });
        await setDocument('subscriptions', id, { purchasedAddons: addons });
        message.success(`Пакет «${confirmTarget.name}» подтверждён и активирован.`);
      }

      setConfirmTarget(null);
      await load();
    } catch (e) {
      message.error('Ошибка: ' + (e.message ?? e));
    } finally { setBusy(false); }
  };

  const resetPassword = () => {
    Modal.confirm({
      title: `Сбросить пароль для «${admin.name}»?`,
      content: 'Будет сгенерирован новый пароль. Старый перестанет работать.',
      okText: 'Сбросить', cancelText: 'Отмена', centered: true,
      onOk: async () => {
        setBusy(true);
        try {
          const newPassword = await resetUserPassword({ email: admin.email, oldPassword: admin.password });
          await updateDocument('users', id, { password: newPassword });
          message.success('Пароль сброшен');
          await load();
        } catch (e) {
          message.error('Не удалось сбросить пароль: ' + (e.message ?? e));
        } finally { setBusy(false); }
      },
    });
  };

  const changeTariff = async () => {
    if (!newTariffId) return;
    setBusy(true);
    try {
      await setDocument('subscriptions', id, { tariffId: newTariffId });
      message.success('Тариф изменён');
      setTariffOpen(false);
      load();
    } catch (e) {
      message.error('Ошибка: ' + (e.message ?? e));
    } finally { setBusy(false); }
  };

  if (loading) return <div style={{ padding: 20 }}><Skeleton active /></div>;
  if (!admin) return <div style={{ padding: 20, color: 'var(--txt-lo)' }}>Админ не найден</div>;

  const usageRow = (label, count, target) => {
    const lim = effectiveLimit(sub, tariff, target);
    return <KV k={label} v={lim === Infinity ? `${count} / ∞` : `${count} / ${lim}`} />;
  };

  const pendingAddons = (sub?.purchasedAddons ?? []).filter(a => (a.status ?? 'active') === 'pending');
  const hasPendingTariff = sub?.status === 'pending';
  const hasPendingItems = hasPendingTariff || pendingAddons.length > 0;

  const confirmModalTitle = confirmTarget?.kind === 'tariff'
    ? `Подтвердить оплату тарифа «${tariff?.name ?? '—'}»`
    : `Подтвердить оплату пакета «${confirmTarget?.name ?? '—'}»`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title={admin.name} eyebrow="Админ" onBack={() => nav(-1)} />
      <div className="page-scroll">
        <GlassCard gold style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Подписка</div>
          <KV k="Тариф" v={tariff?.name ?? '—'} />
          <KV k="Цена" v={tariff ? `${fmt(tariff.monthlyPrice)}/мес` : '—'} />
          <KV k="Статус тарифа" v={sub?.status === 'active' ? 'Активна' : sub?.status === 'pending' ? 'Ожидает оплаты' : 'Нет'}
            vStyle={{ color: sub?.status === 'active' ? 'var(--ok)' : 'var(--warn)' }} />
          <KV k="Следующий платёж" v={sub?.nextPaymentDate ? fmtDate(sub.nextPaymentDate) : '—'} />
          <Divider style={{ margin: '10px 0' }} />
          <button onClick={() => { setNewTariffId(sub?.tariffId ?? null); setTariffOpen(true); }} style={btn(true)}>
            Сменить тариф
          </button>
        </GlassCard>

        {admin.login && (
          <GlassCard style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Данные для входа</div>
            {admin.password ? (
              <CredentialsBox name={admin.name} login={admin.login} password={admin.password} />
            ) : (
              <div className="faint" style={{ fontSize: 12.5 }}>
                Логин: <b style={{ color: 'var(--txt-hi)' }}>{admin.login}</b> · пароль не сохранён
              </div>
            )}
            <button
              onClick={resetPassword}
              disabled={busy || !admin.password}
              style={{
                ...btn(true), marginTop: 12, width: '100%',
                cursor: (busy || !admin.password) ? 'default' : 'pointer',
                color: (busy || !admin.password) ? 'var(--txt-faint)' : 'var(--txt-mid)',
              }}
            >
              <RefreshCw size={14} strokeWidth={1.8} /> Сбросить пароль
            </button>
          </GlassCard>
        )}

        {hasPendingItems && (
          <GlassCard style={{ marginBottom: 14, border: '1px solid rgba(232,194,75,.35)' }}>
            <div className="eyebrow" style={{ marginBottom: 10, color: 'var(--warn)' }}>Ожидают подтверждения</div>

            {hasPendingTariff && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Смена тарифа → {tariff?.name ?? '—'}</div>
                  <div className="faint" style={{ fontSize: 11, marginTop: 2 }}>{tariff ? fmt(tariff.monthlyPrice) + '/мес' : ''}</div>
                </div>
                <button onClick={openConfirmTariff} style={confirmBtn()}>
                  <CheckCircle2 size={13} strokeWidth={2} /> Подтвердить
                </button>
              </div>
            )}

            {pendingAddons.map((a, i) => {
              const def = addonDefs.find(d => d.id === a.addonId);
              const name = def?.name ?? a.addonId;
              const targetLabel = a.target === 'clients' ? 'клиентов' : a.target === 'investors' ? 'инвесторов' : 'заявок';
              return (
                <div key={a.addedAt ?? i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 0', borderTop: (i > 0 || hasPendingTariff) ? '1px solid var(--line)' : undefined }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                    <div className="faint" style={{ fontSize: 11, marginTop: 2 }}>
                      +{a.extra} {targetLabel}{def ? ' · ' + fmt(def.price) : ''}
                    </div>
                  </div>
                  <button onClick={() => openConfirmAddon(a)} style={confirmBtn()}>
                    <CheckCircle2 size={13} strokeWidth={2} /> Подтвердить
                  </button>
                </div>
              );
            })}
          </GlassCard>
        )}

        <GlassCard style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Использование лимитов</div>
          {usageRow('Клиенты', counts.clients, 'clients')}
          {usageRow('Инвесторы', counts.investors, 'investors')}
          {usageRow('Заявки', counts.applications, 'applications')}
        </GlassCard>

        <GlassCard>
          <div className="eyebrow" style={{ marginBottom: 8 }}>История оплат</div>
          {payments.length === 0 && <div className="faint" style={{ fontSize: 12.5 }}>Оплат пока нет</div>}
          {payments.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 0', borderTop: '1px solid var(--line)' }}>
              <div>
                <div style={{ fontSize: 12.5 }}>{fmtDate(p.paidAt)}</div>
                {p.note && <div className="faint" style={{ fontSize: 11, marginTop: 1 }}>{p.note}</div>}
              </div>
              <span className="num" style={{ fontSize: 13 }}>{fmt(p.amount)}</span>
            </div>
          ))}
        </GlassCard>
      </div>

      <Modal open={!!confirmTarget} title={confirmModalTitle}
        okText="Подтвердить" cancelText="Отмена"
        confirmLoading={busy} onOk={confirmPayment} onCancel={() => setConfirmTarget(null)} centered>
        <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--txt-mid)', marginBottom: 6 }}>Сумма (₽)</div>
            <InputNumber size="large" style={{ width: '100%' }} min={0} value={payAmount} onChange={setPayAmount}
              formatter={v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={v => v.replace(/\s/g, '')} />
          </div>
          {confirmTarget?.kind === 'tariff' && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--txt-mid)', marginBottom: 6 }}>Дата следующего платежа</div>
              <DatePicker size="large" style={{ width: '100%' }} format="DD.MM.YYYY"
                value={payDate} onChange={setPayDate} allowClear={false} />
            </div>
          )}
        </div>
      </Modal>

      <Modal open={tariffOpen} title="Сменить тариф" okText="Сохранить" cancelText="Отмена"
        confirmLoading={busy} onOk={changeTariff} onCancel={() => setTariffOpen(false)} centered>
        <div style={{ paddingTop: 8 }}>
          <Select size="large" style={{ width: '100%' }} value={newTariffId} onChange={setNewTariffId}
            options={tariffs.map(t => ({ value: t.id, label: `${t.name} · ${fmt(t.monthlyPrice)}/мес` }))} />
        </div>
      </Modal>
    </div>
  );
}

function btn(secondary) {
  return {
    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    fontSize: 12, fontWeight: 600, padding: '10px 13px', borderRadius: 10, cursor: 'pointer',
    background: secondary ? 'var(--glass)' : 'rgba(91,212,154,.1)',
    border: `1px solid ${secondary ? 'var(--line)' : 'rgba(91,212,154,.35)'}`,
    color: secondary ? 'var(--txt-mid)' : 'var(--ok)',
  };
}

function confirmBtn() {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11.5, fontWeight: 600, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
    background: 'rgba(91,212,154,.1)', border: '1px solid rgba(91,212,154,.35)', color: 'var(--ok)',
    whiteSpace: 'nowrap',
  };
}
