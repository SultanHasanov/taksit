/**
 * Чипсы для переключения между договорами клиента. Показывается только если
 * договоров больше одного.
 */
export default function ContractSwitcher({ apps, selectedId, onSelect }) {
  if (!apps || apps.length <= 1) return null;
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14, paddingBottom: 2 }}>
      {apps.map(a => {
        const active = a.id === selectedId;
        return (
          <button key={a.id} onClick={() => onSelect(a.id)}
            style={{
              flexShrink: 0, padding: '8px 14px', borderRadius: 11, fontSize: 12,
              fontWeight: 600, cursor: 'pointer', maxWidth: 200,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              border: '1px solid var(--line)',
              background: active ? 'var(--gold)' : 'var(--glass)',
              color: active ? 'var(--navy-950)' : 'var(--txt-mid)',
            }}>
            {a.product}
          </button>
        );
      })}
    </div>
  );
}
