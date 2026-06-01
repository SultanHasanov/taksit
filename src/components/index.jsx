import { Progress, Tag } from 'antd';
import { ChevronRight, Trash2 } from 'lucide-react';
import { fmt } from '../lib/format';

// ── GlassCard ────────────────────────────────────────────────────────────────
export function GlassCard({ gold, children, style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: gold
          ? 'linear-gradient(155deg,var(--gold-soft),rgba(255,255,255,.02))'
          : 'rgba(255,255,255,0.045)',
        border: `1px solid ${gold ? 'var(--line-gold)' : 'var(--line)'}`,
        borderRadius: 18,
        padding: 16,
        cursor: onClick ? 'pointer' : undefined,
        transition: '.2s',
        ...style,
      }}>
      {children}
    </div>
  );
}

// ── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, dot, style }) {
  return (
    <GlassCard style={{ padding: '16px 16px 17px', display: 'flex', flexDirection: 'column', gap: 11, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--txt-mid)', fontWeight: 500 }}>
        {dot && <span className={`sdot ${dot}`} />} {label}
      </div>
      <div className="num" style={{ fontSize: 25, fontWeight: 600, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: 'var(--txt-lo)' }}>{sub}</div>}
    </GlassCard>
  );
}

// ── StatusPill ───────────────────────────────────────────────────────────────
const STATUS_MAP = {
  paid:   { bg: 'rgba(91,212,154,.13)',  color: 'var(--ok)',       label: 'Оплачен' },
  next:   { bg: 'var(--gold-soft)',       color: 'var(--gold-lite)', label: 'Следующий' },
  due:    { bg: 'rgba(105,114,138,.12)', color: 'var(--txt-lo)',   label: 'Ожидается' },
  active: { bg: 'rgba(91,212,154,.13)',  color: 'var(--ok)',       label: 'Активно' },
  closed: { bg: 'rgba(105,114,138,.1)', color: 'var(--txt-lo)',   label: 'Закрыто' },
  draft:  { bg: 'rgba(105,114,138,.14)', color: 'var(--txt-mid)', label: 'Черновик' },
};

export function StatusPill({ status, style }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.due;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '4px 9px', borderRadius: 8,
      letterSpacing: '.02em', background: s.bg, color: s.color,
      display: 'inline-flex', alignItems: 'center', gap: 5, ...style,
    }}>
      {status === 'paid' && <span className="sdot ok" style={{ width: 6, height: 6 }} />}
      {s.label}
    </span>
  );
}

// ── RiskBadge ────────────────────────────────────────────────────────────────
export function RiskBadge({ risk }) {
  const map = {
    low:  { bg: 'rgba(91,212,154,.12)',  color: 'var(--ok)',   dot: 'ok',   label: 'Низкий риск' },
    mid:  { bg: 'rgba(232,194,75,.12)',  color: 'var(--warn)', dot: 'warn', label: 'Средний риск' },
    high: { bg: 'rgba(240,104,106,.12)', color: 'var(--bad)',  dot: 'bad',  label: 'Высокий риск' },
  };
  const s = map[risk] ?? map.low;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '5px 10px', borderRadius: 9, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color,
    }}>
      <span className={`sdot ${s.dot}`} /> {s.label}
    </span>
  );
}

// ── MiniDot ──────────────────────────────────────────────────────────────────
export function MiniDot({ type }) {
  return <span className={`sdot ${type}`} />;
}

// ── ProgressBar ──────────────────────────────────────────────────────────────
export function ProgressBar({ pct, style }) {
  return (
    <div style={{ height: 6, borderRadius: 6, background: 'var(--navy-700)', overflow: 'hidden', ...style }}>
      <div style={{
        height: '100%', borderRadius: 6, width: `${pct}%`,
        background: 'linear-gradient(90deg,var(--gold-deep),var(--gold-lite))',
        transition: '.3s',
      }} />
    </div>
  );
}

// ── Ring ─────────────────────────────────────────────────────────────────────
export function Ring({ pct, size = 120 }) {
  const r = size * 0.433;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--navy-600)" strokeWidth={10} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke="url(#ring-grad)" strokeWidth={10} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8C6F30" />
            <stop offset="1" stopColor="#E6CD8C" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div className="num" style={{ fontSize: size * 0.22, fontWeight: 600 }}>{pct}%</div>
        <div style={{ fontSize: size * 0.08, color: 'var(--txt-lo)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Погашено</div>
      </div>
    </div>
  );
}

// ── Timeline (payment dots) ───────────────────────────────────────────────────
export function Timeline({ payments }) {
  const total = payments.length;
  const paidCount = payments.filter(p => p.status === 'paid').length;
  const paidPct = total > 1 ? (paidCount / (total - 1)) * 100 : 100;

  return (
    <div style={{ position: 'relative', padding: '24px 6px 4px' }}>
      {/* Track */}
      <div style={{ position: 'relative', height: 3, borderRadius: 3, background: 'var(--navy-600)' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: 3, borderRadius: 3, width: `${paidPct}%`,
          background: 'linear-gradient(90deg,var(--gold-deep),var(--gold-lite))',
          boxShadow: '0 0 14px rgba(203,164,90,.55)',
        }} />
        {/* Dots */}
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0,
          display: 'flex', justifyContent: 'space-between',
          transform: 'translateY(-50%)',
        }}>
          {payments.map((p, i) => {
            const isPaid  = p.status === 'paid';
            const isNext  = p.status === 'next';
            return (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: '50%', position: 'relative',
                background: isPaid ? 'rgba(203,164,90,.18)' : isNext ? 'rgba(203,164,90,.25)' : 'var(--navy-700)',
                flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', inset: 3, borderRadius: '50%',
                  background: isPaid
                    ? 'linear-gradient(150deg,#E6CD8C,#CBA45A)'
                    : isNext ? '#E6CD8C' : 'var(--navy-600)',
                  boxShadow: isPaid ? '0 0 10px 1px rgba(203,164,90,.85)' : undefined,
                }} />
                {isNext && (
                  <div style={{
                    position: 'absolute', inset: -4, borderRadius: '50%',
                    border: '2px solid var(--gold)',
                    animation: 'pulse 1.8s ease-out infinite',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
        {payments.map((p, i) => (
          <span key={i} style={{
            fontSize: 9, width: 14, textAlign: 'center',
            color: p.status === 'paid' || p.status === 'next' ? 'var(--gold-lite)' : 'var(--txt-faint)',
            fontFamily: 'var(--disp)',
          }}>{p.date?.split(' ')[1]?.slice(0, 3) ?? i + 1}</span>
        ))}
      </div>
    </div>
  );
}

// ── VBars ─────────────────────────────────────────────────────────────────────
export function VBars({ values, labels, activeIdx }) {
  const max = Math.max(...values);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, height: 128 }}>
      {values.map((v, i) => (
        <div key={i} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 8, height: '100%', justifyContent: 'flex-end',
        }}>
          <div style={{
            width: '100%', borderRadius: '7px 7px 3px 3px', minHeight: 5,
            height: `${Math.round(v / max * 100)}%`,
            background: i === activeIdx
              ? 'linear-gradient(180deg,var(--gold-lite),var(--gold-deep))'
              : 'linear-gradient(180deg,var(--navy-600),var(--navy-700))',
            transition: '.3s',
          }} />
          <div style={{ fontSize: 9, color: 'var(--txt-lo)', fontFamily: 'var(--disp)' }}>{labels[i]}</div>
        </div>
      ))}
    </div>
  );
}

// ── SettingsRow ───────────────────────────────────────────────────────────────
export function SettingsRow({ icon: Icon, title, subtitle, danger, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 13,
      padding: '14px 2px', borderTop: '1px solid var(--line)',
      cursor: 'pointer', transition: '.2s',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11, flexShrink: 0,
        display: 'grid', placeItems: 'center',
        background: danger ? 'rgba(240,104,106,.08)' : 'var(--navy-700)',
        border: `1px solid ${danger ? 'rgba(240,104,106,.2)' : 'var(--line)'}`,
        color: danger ? 'var(--bad)' : 'var(--gold-lite)',
      }}>
        <Icon size={18} strokeWidth={1.7} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: danger ? 'var(--bad)' : 'var(--txt-hi)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--txt-lo)', marginTop: 1 }}>{subtitle}</div>}
      </div>
      <ChevronRight size={18} strokeWidth={1.7} color="var(--txt-faint)" />
    </div>
  );
}

// ── ClientRow ─────────────────────────────────────────────────────────────────
export function ClientRow({ client, statusDot, statusLabel, amount, sub, count, onClick, onDelete }) {
  const ini = (client?.name ?? '??').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 13,
      padding: 14, borderRadius: 15, marginBottom: 10,
      background: 'var(--glass)', border: '1px solid var(--line)',
      cursor: 'pointer', transition: '.2s',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        display: 'grid', placeItems: 'center',
        fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 14, color: 'var(--gold-lite)',
        background: 'var(--navy-700)', border: '1px solid var(--line)',
      }}>{ini}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client?.name}</span>
          {count > 1 && (
            <span style={{
              flexShrink: 0, fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--disp)',
              padding: '2px 7px', borderRadius: 7, color: 'var(--gold-lite)',
              background: 'var(--gold-soft)', border: '1px solid var(--line-gold)',
            }}>×{count}</span>
          )}
        </div>
        <div className="faint" style={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div className="num" style={{ fontSize: 14 }}>{fmt(amount)}</div>
        {statusDot && (
          <div style={{ fontSize: 10.5, display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'flex-end', marginTop: 3 }}
               className={`s-${statusDot}`}>
            <MiniDot type={statusDot} /> {statusLabel}
          </div>
        )}
      </div>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(client); }}
          title="Удалить клиента"
          style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center',
            background: 'rgba(240,104,106,.08)', border: '1px solid rgba(240,104,106,.22)', color: 'var(--bad)', cursor: 'pointer' }}>
          <Trash2 size={15} strokeWidth={1.8} />
        </button>
      )}
    </div>
  );
}

// ── KV row ────────────────────────────────────────────────────────────────────
export function KV({ k, v, vStyle }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 0', fontSize: 13,
    }}>
      <span style={{ color: 'var(--txt-mid)' }}>{k}</span>
      <span className="num" style={{ color: 'var(--txt-hi)', ...vStyle }}>{v}</span>
    </div>
  );
}

export function Divider({ style }) {
  return <div style={{ height: 1, background: 'var(--line)', margin: '14px 0', ...style }} />;
}

// ── Section header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <div className="h-title" style={{ fontSize: 16 }}>{title}</div>
      {right && <div className="faint" style={{ fontSize: 11.5 }}>{right}</div>}
    </div>
  );
}
