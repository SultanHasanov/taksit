import { useEffect, useState } from 'react';
import { Skeleton, Modal, Select, message } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { getDocument, getCollection, setDocument } from '../../firebase/db';
import { effectiveLimit, currentCount } from '../../lib/limits';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard, KV, Divider, ProgressBar, StatusPill } from '../../components';
import { fmt, fmtDate } from '../../lib/format';

export default function AdminSubscription() {
  const { uid } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState(null);
  const [tariff, setTariff] = useState(null);
  const [tariffs, setTariffs] = useState([]);
  const [addons, setAddons] = useState([]);
  const [counts, setCounts] = useState({ clients: 0, investors: 0, applications: 0 });

  const [tariffOpen, setTariffOpen] = useState(false);
  const [addonOpen, setAddonOpen] = useState(false);
  const [pick, setPick] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!uid) return;
    const s = await getDocument('subscriptions', uid);
    setSub(s);
    setTariff(s?.tariffId ? await getDocument('tariffs', s.tariffId) : null);
    const [ts, as, c, i, a] = await Promise.all([
      getCollection('tariffs'),
      getCollection('addons'),
      currentCount(uid, 'clients'),
      currentCount(uid, 'investors'),
      currentCount(uid, 'applications'),
    ]);
    setTariffs(ts.filter(t => t.active !== false).sort((x, y) => (x.order ?? 0) - (y.order ?? 0)));
    setAddons(as.filter(x => x.active !== false));
    setCounts({ clients: c, investors: i, applications: a });
    setLoading(false);
  };
  useEffect(() => { load(); }, [uid]);

  const changeTariff = async () => {
    if (!pick) return;
    setBusy(true);
    try {
      await setDocument('subscriptions', uid, { tariffId: pick, status: 'pending' });
      message.success('Заявка на смену тарифа отправлена. Ожидайте подтверждения оплаты.');
      setTariffOpen(false); load();
    } catch (e) { message.error('Ошибка: ' + (e.message ?? e)); }
    finally { setBusy(false); }
  };

  const buyAddon = async () => {
    if (!pick) return;
    const addon = addons.find(a => a.id === pick);
    if (!addon) return;
    setBusy(true);
    try {
      // Читаем актуальный документ из Firestore — не из потенциально устаревшего state
      const fresh = await getDocument('subscriptions', uid);
      const existing = fresh?.purchasedAddons ?? [];
      const purchased = [...existing, {
        addonId: addon.id, target: addon.target, extra: addon.extra,
        status: 'pending', addedAt: new Date().toISOString(),
      }];
      await setDocument('subscriptions', uid, { purchasedAddons: purchased });
      message.success(`Пакет «${addon.name}» добавлен. Ожидайте подтверждения оплаты.`);
      setAddonOpen(false);
      await load();
    } catch (e) { message.error('Ошибка: ' + (e.message ?? e)); }
    finally { setBusy(false); }
  };

  if (loading) return <div style={{ padding: 20 }}><Skeleton active /></div>;

  const usage = (label, count, target) => {
    const lim = effectiveLimit(sub, tariff, target);
    const pct = lim === Infinity ? 0 : Math.min(100, Math.round((count / lim) * 100));
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
          <span style={{ color: 'var(--txt-mid)' }}>{label}</span>
          <span className="num">{lim === Infinity ? `${count} / ∞` : `${count} / ${lim}`}</span>
        </div>
        {lim !== Infinity && <ProgressBar pct={pct} />}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="Подписка" eyebrow="Админ" />
      <div className="page-scroll">
        <GlassCard gold style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="eyebrow">Текущий тариф</div>
            {sub?.status && <StatusPill status={sub.status === 'active' ? 'active' : sub.status === 'pending' ? 'next' : 'closed'}
              style={undefined} />}
          </div>
          <div className="h-title" style={{ fontSize: 24 }}>{tariff?.name ?? 'Нет тарифа'}</div>
          {tariff && <div className="num" style={{ fontSize: 16, color: 'var(--gold-lite)', marginTop: 4 }}>
            {fmt(tariff.monthlyPrice)}<span className="faint" style={{ fontSize: 11 }}> /мес</span>
          </div>}
          <Divider style={{ margin: '12px 0' }} />
          <KV k="Статус" v={sub?.status === 'active' ? 'Активна' : sub?.status === 'pending' ? 'Ожидает оплаты' : 'Нет'}
            vStyle={{ color: sub?.status === 'active' ? 'var(--ok)' : 'var(--warn)' }} />
          <KV k="Следующий платёж" v={sub?.nextPaymentDate ? fmtDate(sub.nextPaymentDate) : '—'} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => { setPick(sub?.tariffId ?? null); setTariffOpen(true); }} style={btn(false)}>Сменить тариф</button>
            <button onClick={() => { setPick(addons[0]?.id ?? null); setAddonOpen(true); }} style={btn(true)}>Купить пакет</button>
          </div>
        </GlassCard>

        <GlassCard style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Использование</div>
          {usage('Клиенты', counts.clients, 'clients')}
          {usage('Инвесторы', counts.investors, 'investors')}
          {usage('Заявки', counts.applications, 'applications')}
        </GlassCard>

        {/* Активные пакеты-расширения */}
        {(sub?.purchasedAddons ?? []).length > 0 && (
          <GlassCard style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Купленные пакеты</div>
            {sub.purchasedAddons.map((a, i) => {
              const addonDef = addons.find(x => x.id === a.addonId);
              const label = addonDef?.name ?? a.addonId;
              const itemStatus = a.status ?? 'active';
              const statusColor = itemStatus === 'active' ? 'var(--ok)' : 'var(--warn)';
              const statusText = itemStatus === 'active' ? 'Активен' : 'Ожидает подтверждения';
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 0', borderTop: i > 0 ? '1px solid var(--line)' : undefined }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                    <div className="faint" style={{ fontSize: 11, marginTop: 2 }}>
                      +{a.extra} {a.target === 'clients' ? 'клиентов' : a.target === 'investors' ? 'инвесторов' : 'заявок'}
                    </div>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: statusColor,
                    padding: '3px 9px', borderRadius: 7,
                    background: itemStatus === 'active' ? 'rgba(91,212,154,.1)' : 'rgba(232,194,75,.1)' }}>
                    {statusText}
                  </span>
                </div>
              );
            })}
          </GlassCard>
        )}

        {(tariff?.features ?? []).length > 0 && (
          <GlassCard>
            <div className="eyebrow" style={{ marginBottom: 8 }}>В тарифе</div>
            {tariff.features.map((f, i) => (
              <div key={i} className="faint" style={{ fontSize: 12.5, padding: '3px 0' }}>· {f}</div>
            ))}
          </GlassCard>
        )}
      </div>

      <Modal open={tariffOpen} title="Сменить тариф" okText="Отправить заявку" cancelText="Отмена"
        confirmLoading={busy} onOk={changeTariff} onCancel={() => setTariffOpen(false)} centered>
        <div style={{ paddingTop: 8 }}>
          <Select size="large" style={{ width: '100%' }} value={pick} onChange={setPick}
            options={tariffs.map(t => ({ value: t.id, label: `${t.name} · ${fmt(t.monthlyPrice)}/мес` }))} />
          <div style={{ fontSize: 11.5, color: 'var(--txt-lo)', marginTop: 12 }}>
            После выбора подписка перейдёт в статус «ожидает оплаты». Активирует супер-админ после оплаты.
          </div>
        </div>
      </Modal>

      <Modal open={addonOpen} title="Купить пакет" okText="Отправить заявку" cancelText="Отмена"
        confirmLoading={busy} onOk={buyAddon} onCancel={() => setAddonOpen(false)} centered>
        <div style={{ paddingTop: 8 }}>
          {addons.length === 0 ? (
            <div className="faint" style={{ fontSize: 12.5 }}>Пакеты пока не настроены</div>
          ) : (
            <Select size="large" style={{ width: '100%' }} value={pick} onChange={setPick}
              options={addons.map(a => ({ value: a.id, label: `${a.name} · ${fmt(a.price)}` }))} />
          )}
        </div>
      </Modal>
    </div>
  );
}

function btn(secondary) {
  return {
    flex: 1, padding: '10px 13px', borderRadius: 10, cursor: 'pointer',
    fontSize: 12.5, fontWeight: 600,
    background: secondary ? 'var(--glass)' : 'linear-gradient(145deg,#E6CD8C,#CBA45A)',
    border: `1px solid ${secondary ? 'var(--line)' : 'transparent'}`,
    color: secondary ? 'var(--txt-mid)' : '#2A2008',
  };
}
