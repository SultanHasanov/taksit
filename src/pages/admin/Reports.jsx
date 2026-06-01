import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getOwnedApplications } from '../../firebase/db';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard, StatCard, VBars, SectionHeader } from '../../components';
import { fmt, fmtShort } from '../../lib/format';

export default function AdminReports() {
  const { ownerId } = useAuth();
  const [apps, setApps] = useState([]);

  useEffect(() => {
    if (!ownerId) return;
    getOwnedApplications(ownerId).then(setApps);
  }, [ownerId]);

  const active = apps.filter(a => a.status === 'active');
  const closed = apps.filter(a => a.status === 'closed');
  const totalSum = apps.reduce((s, a) => s + (a.amount ?? 0), 0);

  const categoryMap = {};
  apps.forEach(a => {
    const cat = a.category ?? 'Прочее';
    categoryMap[cat] = (categoryMap[cat] ?? 0) + (a.amount ?? 0);
  });
  const categories = Object.entries(categoryMap).sort((a,b) => b[1]-a[1]).slice(0, 5);
  const maxCat = Math.max(...categories.map(([,v]) => v), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title="Отчёты" eyebrow="Админ"
        right={
          <button style={{ width:40,height:40,borderRadius:12,display:'grid',placeItems:'center',background:'var(--glass)',border:'1px solid var(--line)',color:'var(--txt-mid)',cursor:'pointer' }}>
            <Download size={18} strokeWidth={1.7} />
          </button>
        }
      />
      <div className="page-scroll">
        {/* Total */}
        <GlassCard gold style={{ marginBottom: 14 }}>
          <div className="faint" style={{ fontSize: 11 }}>Портфель под управлением</div>
          <div className="num" style={{ fontSize: 32, fontWeight: 600, margin: '8px 0 4px' }}>
            {fmtShort(totalSum)}
          </div>
          <div className="s-ok" style={{ fontSize: 11.5 }}>▲ {active.length} активных договоров</div>
        </GlassCard>

        {/* Bar chart — выдачи по месяцам (demo) */}
        <GlassCard style={{ marginBottom: 14, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="h-title" style={{ fontSize: 15 }}>Выдачи по месяцам</div>
            <span className="faint" style={{ fontSize: 11 }}>млн ₽</span>
          </div>
          <VBars
            values={[11.2, 13.8, 12.1, 15.6, 14.0, 16.4]}
            labels={['Дек','Янв','Фев','Мар','Апр','Май']}
            activeIdx={5}
          />
        </GlassCard>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 14 }}>
          <StatCard label="Активных" dot="ok" value={active.length} />
          <StatCard label="Закрытых"           value={closed.length} />
        </div>

        {/* Categories */}
        <GlassCard style={{ padding: 18 }}>
          <SectionHeader title="Портфель по категориям" />
          {categories.map(([name, sum]) => {
            const pct = Math.round(sum / totalSum * 100) || 0;
            return (
              <div key={name} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 7 }}>
                  <span className="muted">{name}</span>
                  <span className="num">{pct}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 6, background: 'var(--navy-700)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 6, width: `${pct}%`, background: 'linear-gradient(90deg,var(--gold-deep),var(--gold-lite))' }} />
                </div>
              </div>
            );
          })}
        </GlassCard>
      </div>
    </div>
  );
}
