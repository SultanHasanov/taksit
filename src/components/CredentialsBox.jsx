import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { message } from 'antd';

/**
 * Показывает выданные логин и пароль с кнопкой копирования сразу обоих —
 * чтобы админ мог одним нажатием скопировать и отправить человеку.
 */
export default function CredentialsBox({ name, login, password }) {
  const [copied, setCopied] = useState(false);

  const copyBoth = async () => {
    const text = `Логин: ${login}\nПароль: ${password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      message.success('Логин и пароль скопированы');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      message.error('Не удалось скопировать');
    }
  };

  const row = (label, value) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 11.5, color: 'var(--txt-mid)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--disp)', fontSize: 14.5, color: 'var(--txt-hi)', fontWeight: 600, userSelect: 'all' }}>
        {value}
      </span>
    </div>
  );

  return (
    <div style={{
      borderRadius: 14, padding: '14px 16px',
      background: 'rgba(203,164,90,.07)', border: '1px solid var(--line-gold)',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold-lite)', fontWeight: 600 }}>
          Данные для входа{name ? ` · ${name}` : ''}
        </span>
        <button onClick={copyBoth} title="Копировать логин и пароль"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            fontSize: 11.5, fontWeight: 600, padding: '6px 11px', borderRadius: 9,
            background: copied ? 'rgba(91,212,154,.12)' : 'var(--glass)',
            border: `1px solid ${copied ? 'rgba(91,212,154,.4)' : 'var(--line)'}`,
            color: copied ? 'var(--ok)' : 'var(--txt-mid)',
          }}>
          {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.8} />}
          {copied ? 'Скопировано' : 'Копировать'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {row('Логин', login)}
        <div style={{ height: 1, background: 'var(--line)' }} />
        {row('Пароль', password)}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--txt-lo)', marginTop: 11 }}>
        Сохраните и отправьте — пароль показывается полностью только сейчас.
      </div>
    </div>
  );
}
