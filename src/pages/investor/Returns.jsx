import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCollection, where, byCreatedAtDesc } from '../../firebase/db';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard, StatCard, VBars, SectionHeader } from '../../components';
import { fmt, fmtShort, fmtDate } from '../../lib/format';

export default function InvReturns() {
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const invs = await getCollection('investors', [where('uid', '==', user.uid)]);
      if (!invs.length) { setLoading(false); return; }
      const a = await getCollection('applications', [where('investorId', '==', invs[0].id)]);
      setApps(a.sort(byCreatedAtDesc)); setLoading(false);
    })();
  }, [user]);

  const totalEarned  = apps.reduce((s, a) => {
    const perPayment = ((a.total ?? 0) - (a.amount ?? 0)) / (a.term ?? 1);
    return s + perPayment * (a.paidCount ?? 0);
  }, 0);
  const totalForecast = apps.reduce((s, a) => s + ((a.total ?? 0) - (a.amount ?? 0)), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="Доход" eyebrow="Инвестор"
        right={
          <button style={{ width:40,height:40,borderRadius:12,display:'grid',placeItems:'center',background:'var(--glass)',border:'1px solid var(--line)',color:'var(--txt-mid)',cursor:'pointer' }}>
            <Download size={18} strokeWidth={1.7} />
          </button>
        }
      />
      <div className="page-scroll">
        <GlassCard gold style={{ marginBottom: 14 }}>
          <div className="faint" style={{ fontSize: 11 }}>Заработано</div>
          <div className="num" style={{ fontSize: 34, fontWeight: 600, margin: '8px 0 4px', color: 'var(--gold-lite)' }}>
            {fmtShort(totalEarned)}
          </div>
          <div className="s-ok" style={{ fontSize: 11.5 }}>прогноз итого: +{fmtShort(totalForecast)}</div>
        </GlassCard>

        <GlassCard style={{ marginBottom: 14, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="h-title" style={{ fontSize: 15 }}>Выплаты по месяцам</div>
            <span className="faint" style={{ fontSize: 11 }}>тыс ₽</span>
          </div>
          <VBars
            values={[420, 510, 485, 620, 560, 690]}
            labels={['Мар','Апр','Май','Июн','Июл','Авг']}
            activeIdx={5}
          />
        </GlassCard>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 18 }}>
          <StatCard label="Реализовано"  value={fmtShort(totalEarned)} />
          <StatCard label="Прогноз" value={'+' + fmtShort(totalForecast - totalEarned)} />
        </div>

        <SectionHeader title="Поступления по договорам" />
        {apps.filter(a => (a.paidCount ?? 0) > 0).map(app => {
          const perPay = ((app.total ?? 0) - (app.amount ?? 0)) / (app.term ?? 1);
          const earned = Math.round(perPay * (app.paidCount ?? 0));
          return (
            <div key={app.id} style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: 14, borderRadius: 15,
              background: 'var(--glass)', border: '1px solid var(--line)', marginBottom: 10,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center',
                background: 'rgba(91,212,154,.08)', border: '1px solid rgba(91,212,154,.2)',
                color: 'var(--ok)', flexShrink: 0,
              }}>
                <span style={{ fontFamily: 'var(--disp)', fontWeight: 700, fontSize: 16 }}>₽</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {app.product}
                </div>
                <div className="faint" style={{ fontSize: 11, marginTop: 1 }}>
                  {app.paidCount} платежей получено
                </div>
              </div>
              <div className="num" style={{ fontSize: 14, color: 'var(--gold-lite)', flexShrink: 0 }}>
                +{fmt(earned)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
