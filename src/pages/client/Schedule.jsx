import { useEffect, useState } from 'react';
import { Skeleton } from 'antd';
import { Download } from 'lucide-react';
import { getPayments } from '../../firebase/db';
import { useClientApps } from '../../hooks/useClientApps';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard, StatusPill } from '../../components';
import ContractSwitcher from '../../components/ContractSwitcher';
import { fmt, fmtDate, dayjs } from '../../lib/format';

function downloadSchedulePdf(app, payments) {
  import('pdfmake/build/pdfmake').then(async (m) => {
    const pdfMake = m.default ?? m;
    const vfs = await import('pdfmake/build/vfs_fonts');
    pdfMake.vfs = vfs.default?.pdfMake?.vfs ?? vfs.pdfMake?.vfs ?? vfs.default?.vfs ?? vfs.vfs ?? {};

    const tableBody = [
      [
        { text: '№',      bold: true, fillColor: '#e8e8f0', margin: [4,4,4,4], fontSize: 9 },
        { text: 'Дата',   bold: true, fillColor: '#e8e8f0', margin: [4,4,4,4], fontSize: 9 },
        { text: 'Тело долга', bold: true, fillColor: '#e8e8f0', margin: [4,4,4,4], fontSize: 9 },
        { text: 'Наценка',   bold: true, fillColor: '#e8e8f0', margin: [4,4,4,4], fontSize: 9 },
        { text: 'Сумма',     bold: true, fillColor: '#e8e8f0', margin: [4,4,4,4], fontSize: 9 },
        { text: 'Статус',    bold: true, fillColor: '#e8e8f0', margin: [4,4,4,4], fontSize: 9 },
      ],
      ...payments.map(p => {
        const statusLabel = p.status === 'paid' ? 'Оплачен' : p.status === 'next' ? 'Следующий' : 'Ожидает';
        const statusColor = p.status === 'paid' ? '#22c55e' : p.status === 'next' ? '#CBA45A' : '#888';
        return [
          { text: p.n,                                         margin: [4,3,4,3], fontSize: 10 },
          { text: p.date,                                      margin: [4,3,4,3], fontSize: 10 },
          { text: (p.body ?? 0).toLocaleString('ru-RU'),       margin: [4,3,4,3], fontSize: 10 },
          { text: (p.profit ?? 0).toLocaleString('ru-RU'),     margin: [4,3,4,3], fontSize: 10 },
          { text: (p.amount ?? 0).toLocaleString('ru-RU'),     margin: [4,3,4,3], fontSize: 10, bold: true },
          { text: statusLabel, color: statusColor,             margin: [4,3,4,3], fontSize: 10 },
        ];
      }),
    ];

    const financed = Math.max(0, (app.amount ?? 0) - (app.downPayment ?? 0));
    const paidCount = payments.filter(p => p.status === 'paid').length;
    const paidSum   = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.paidAmount ?? p.amount), 0);

    const def = {
      pageSize: 'A4',
      pageMargins: [50, 60, 50, 60],
      defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.4 },
      content: [
        { text: 'ГРАФИК ПЛАТЕЖЕЙ', fontSize: 16, bold: true, alignment: 'center', margin: [0,0,0,6] },
        { text: `Договор: ${app.product ?? '—'}`, alignment: 'center', fontSize: 10, color: '#555', margin: [0,0,0,20] },

        {
          columns: [
            { stack: [
              { text: 'Сумма рассрочки', fontSize: 9, color: '#888' },
              { text: fmt(app.amount ?? 0), bold: true },
            ], width: '*' },
            { stack: [
              { text: 'Первоначальный взнос', fontSize: 9, color: '#888' },
              { text: fmt(app.downPayment ?? 0), bold: true },
            ], width: '*' },
            { stack: [
              { text: 'Финансируется', fontSize: 9, color: '#888' },
              { text: fmt(financed), bold: true },
            ], width: '*' },
          ],
          margin: [0, 0, 0, 8],
        },
        {
          columns: [
            { stack: [
              { text: 'Наценка', fontSize: 9, color: '#888' },
              { text: `${app.percent ?? 0}%`, bold: true },
            ], width: '*' },
            { stack: [
              { text: 'Срок', fontSize: 9, color: '#888' },
              { text: `${app.term ?? 0} мес`, bold: true },
            ], width: '*' },
            { stack: [
              { text: 'Ежемесячно', fontSize: 9, color: '#888' },
              { text: fmt(app.monthly ?? 0), bold: true },
            ], width: '*' },
          ],
          margin: [0, 0, 0, 8],
        },
        {
          columns: [
            { stack: [
              { text: 'Итого к возврату', fontSize: 9, color: '#888' },
              { text: fmt(app.total ?? 0), bold: true, color: '#1a4a8a' },
            ], width: '*' },
            { stack: [
              { text: 'Дата начала', fontSize: 9, color: '#888' },
              { text: app.fundedFromDate ? fmtDate(app.fundedFromDate) : '—', bold: true },
            ], width: '*' },
            { stack: [
              { text: 'Оплачено', fontSize: 9, color: '#888' },
              { text: `${paidCount} из ${payments.length} · ${fmt(paidSum)}`, bold: true, color: '#22c55e' },
            ], width: '*' },
          ],
          margin: [0, 0, 0, 20],
        },

        {
          table: {
            headerRows: 1,
            widths: [25, '*', '*', '*', '*', '*'],
            body: tableBody,
          },
          layout: {
            hLineWidth: (i) => (i <= 1) ? 1 : 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#cccccc',
            vLineColor: () => '#cccccc',
          },
        },
      ],
    };

    const fileName = `График_${(app.product ?? 'договор').replace(/\s+/g, '_')}.pdf`;
    pdfMake.createPdf(def).download(fileName);
  });
}

export default function ClientSchedule() {
  const { apps, selected: app, selectedId, setSelectedId, loading } = useClientApps();
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (!app) { setPayments([]); return; }
    getPayments(app.id).then(setPayments);
  }, [app?.id]);

  const paidCount = payments.filter(p => p.status === 'paid').length;
  const remaining = (app?.total ?? 0) - payments.filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount,0);

  if (loading) return <div style={{padding:20}}><Skeleton active /></div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh' }}>
      <PageHeader title="График" eyebrow="Клиент"
        right={
          app ? (
            <button
              onClick={() => downloadSchedulePdf(app, payments)}
              title="Скачать график"
              style={{ width:40,height:40,borderRadius:12,display:'grid',placeItems:'center',background:'var(--glass)',border:'1px solid var(--line)',color:'var(--txt-mid)',cursor:'pointer' }}>
              <Download size={18} strokeWidth={1.7} />
            </button>
          ) : null
        }
      />
      <div className="page-scroll">
        <ContractSwitcher apps={apps} selectedId={selectedId} onSelect={setSelectedId} />

        {!app && (
          <div style={{ textAlign:'center', marginTop:60, color:'var(--txt-lo)', fontSize:14 }}>
            У вас пока нет договоров
          </div>
        )}

        {app && (
          <GlassCard gold style={{ marginBottom: 14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div className="faint" style={{ fontSize:11 }}>Договор</div>
                <div style={{ fontWeight:600, fontSize:14.5, marginTop:3 }}>{app.product}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div className="num" style={{ fontSize:18, color:'var(--gold-lite)' }}>{fmt(app.monthly)}</div>
                <div className="faint" style={{ fontSize:10.5 }}>в месяц</div>
              </div>
            </div>
          </GlassCard>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:9, marginBottom:16 }}>
          {[
            ['Оплачено', `${paidCount}/${payments.length}`, 'var(--ok)'],
            ['Остаток',  Math.round(remaining/1000)+'к', undefined],
            ['Срок', app?.term ? app.term+' мес' : '—', undefined],
          ].map(([l,v,c]) => (
            <GlassCard key={l} style={{ padding:'14px 12px', textAlign:'center' }}>
              <div className="num" style={{ fontSize:19, color:c }}>{v}</div>
              <div className="faint" style={{ fontSize:10, marginTop:4 }}>{l}</div>
            </GlassCard>
          ))}
        </div>

        {payments.map(p => (
          <GlassCard key={p.id} style={{ padding:'14px 16px', marginBottom:10, display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:38, height:38, borderRadius:12, flexShrink:0, display:'grid', placeItems:'center',
              fontFamily:'var(--disp)', fontWeight:600, fontSize:13,
              background:'var(--navy-700)', border:'1px solid var(--line)',
              color: p.status==='paid' ? 'var(--ok)' : p.status==='next' ? 'var(--gold-lite)' : 'var(--txt-lo)',
              borderColor: p.status==='next' ? 'var(--line-gold)' : undefined,
            }}>
              {p.n}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:13.5 }}>Платёж {p.n}</div>
              <div className="faint" style={{ fontSize:11, marginTop:1 }}>{p.date}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div className="num" style={{ fontSize:14 }}>{fmt(p.amount)}</div>
              <div style={{ marginTop:5 }}><StatusPill status={p.status} /></div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
