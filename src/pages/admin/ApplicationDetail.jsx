import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Skeleton, message, Modal, Input } from 'antd';
import { MessageSquare, CheckCircle2, KeyRound, RefreshCw, FileText, Download } from 'lucide-react';
import { getDocument, getPayments, getCollection, addDocument, updateDocument, softDelete, where, byCreatedAtDesc, db } from '../../firebase/db';
import { updateDoc, doc as fsDoc } from 'firebase/firestore';
import { provisionAccount, resetUserPassword } from '../../firebase/adminUsers';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../layout/TopBar';
import { GlassCard, KV, Divider, StatusPill } from '../../components';
import CredentialsBox from '../../components/CredentialsBox';
import ContractSwitcher from '../../components/ContractSwitcher';
import DocumentUploader from '../../components/DocumentUploader';
import { fmt, fmtDate } from '../../lib/format';
import { openContract, downloadContract } from '../../lib/contract';

export default function ApplicationDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { uid: myUid, ownerId } = useAuth();
  const [app, setApp]         = useState(null);
  const [client, setClient]   = useState(null);
  const [investor, setInvestor] = useState(null);
  const [payments, setPayments] = useState([]);
  const [clientApps, setClientApps] = useState([]);
  const [owner, setOwner]     = useState(null);
  const [loading, setLoading]   = useState(true);

  // payment modal state
  const [modalPayment, setModalPayment] = useState(null);
  const [inputAmount, setInputAmount]   = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const inputRef = useRef(null);

  // client access state
  const [credBusy, setCredBusy] = useState(false);

  // message-to-client modal
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);

  const sendMessage = async () => {
    const text = msgText.trim();
    if (!text) { message.warning('Введите сообщение'); return; }
    if (!app?.clientId) { message.error('У заявки нет клиента'); return; }
    setSending(true);
    try {
      await addDocument('notifications', {
        clientId: app.clientId,
        applicationId: id,
        text,
        read: false,
      });
      setMsgText('');
      setMsgOpen(false);
      message.success('Сообщение отправлено клиенту');
    } catch (e) {
      message.error('Ошибка: ' + (e.message ?? e));
    } finally {
      setSending(false);
    }
  };

  const grantClientAccess = async () => {
    if (!client) return;
    setCredBusy(true);
    try {
      const { uid, login, password } = await provisionAccount(client.name, 'client', { ownerId: ownerId ?? app?.ownerId ?? null });
      await updateDocument('clients', client.id, { uid, login, password });
      setClient(c => ({ ...c, uid, login, password }));
      message.success('Доступ выдан');
    } catch (e) {
      message.error('Ошибка: ' + (e.message ?? e));
    } finally {
      setCredBusy(false);
    }
  };

  const resetClientPassword = () => {
    if (!client?.login) return;
    Modal.confirm({
      title: `Сбросить пароль для «${client.name}»?`,
      content: 'Будет сгенерирован новый пароль. Старый перестанет работать.',
      okText: 'Сбросить', cancelText: 'Отмена', centered: true,
      onOk: async () => {
        setCredBusy(true);
        try {
          const newPassword = await resetUserPassword({ email: client.login, oldPassword: client.password });
          await updateDocument('clients', client.id, { password: newPassword });
          setClient(c => ({ ...c, password: newPassword }));
          message.success('Пароль сброшен');
        } catch (e) {
          message.error('Не удалось сбросить пароль: ' + (e.message ?? e));
        } finally {
          setCredBusy(false);
        }
      },
    });
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [a, p] = await Promise.all([getDocument('applications', id), getPayments(id)]);
      setApp(a); setPayments(p);
      if (a?.clientId) {
        setClient(await getDocument('clients', a.clientId));
        const cApps = (await getCollection('applications', [where('clientId', '==', a.clientId)]))
          .filter(x => !x.deleted).sort(byCreatedAtDesc);
        setClientApps(cApps);
      }
      if (a?.investorId) setInvestor(await getDocument('investors', a.investorId));
      if (a?.ownerId) setOwner(await getDocument('users', a.ownerId));
      setLoading(false);
    })();
  }, [id]);

  const paidCount = payments.filter(p => p.status === 'paid').length;
  const earned    = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.paidAmount ?? p.amount), 0);

  const openPayModal = (payment) => {
    setModalPayment(payment);
    setInputAmount(String(payment.amount));
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const closePayModal = () => {
    setModalPayment(null);
    setInputAmount('');
  };

  const submitPayment = async () => {
    if (!modalPayment) return;
    const entered = parseInt(inputAmount.replace(/\D/g, ''), 10);
    if (!entered || entered <= 0) {
      message.warning('Введите сумму платежа');
      return;
    }

    setSubmitting(true);
    try {
      const scheduled = modalPayment.amount;
      const shortage  = scheduled - entered;

      await updateDoc(
        fsDoc(db, `applications/${id}/payments`, modalPayment.id),
        { status: 'paid', paidAmount: entered }
      );

      const sorted = [...payments].sort((a, b) => Number(a.n) - Number(b.n));
      const future = sorted.filter(p => p.id !== modalPayment.id && p.status !== 'paid');

      if (shortage !== 0 && future.length > 0) {
        const perPayment = Math.floor(shortage / future.length);
        const remainder  = shortage - perPayment * future.length;
        for (let i = 0; i < future.length; i++) {
          const extra = i === future.length - 1 ? remainder : 0;
          const newAmount = future[i].amount + perPayment + extra;
          await updateDoc(
            fsDoc(db, `applications/${id}/payments`, future[i].id),
            { amount: newAmount }
          );
        }
      }

      const newPaidCount = paidCount + 1;
      await updateDocument('applications', id, { paidCount: newPaidCount });

      if (future.length > 0) {
        await updateDoc(
          fsDoc(db, `applications/${id}/payments`, future[0].id),
          { status: 'next' }
        );
      }

      setPayments(await getPayments(id));

      if (shortage > 0) {
        message.warning(`Платёж №${modalPayment.n} принят. Недостача ${fmt(shortage)} распределена по ${future.length} платежам`);
      } else if (shortage < 0) {
        message.success(`Платёж №${modalPayment.n} принят (переплата ${fmt(-shortage)} зачтена)`);
      } else {
        message.success(`Платёж №${modalPayment.n} принят`);
      }

      closePayModal();
    } catch (e) {
      message.error('Ошибка: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // document handlers
  const onClientDocsChange = async (docs) => {
    try {
      await updateDocument('clients', client.id, { documents: docs });
      setClient(c => ({ ...c, documents: docs }));
    } catch (e) {
      message.error('Ошибка сохранения документов: ' + (e.message ?? e));
    }
  };

  const onAppDocsChange = async (docs) => {
    try {
      await updateDocument('applications', id, { documents: docs });
      setApp(a => ({ ...a, documents: docs }));
    } catch (e) {
      message.error('Ошибка сохранения документов: ' + (e.message ?? e));
    }
  };

  // contract args shorthand
  const contractArgs = () => ({
    app,
    client,
    investor,
    ownerName: owner?.name ?? '',
    payments,
  });

  if (loading) return <div style={{ padding: 20 }}><Skeleton active /></div>;
  if (!app) return <div style={{ padding: 20, color: 'var(--txt-lo)' }}>Заявка не найдена</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <PageHeader title={`Заявка #${id?.slice(-4)}`} eyebrow="Детали" onBack={() => nav(-1)}
        right={
          <button onClick={() => setMsgOpen(true)} title="Написать клиенту"
            style={{ width:40,height:40,borderRadius:12,display:'grid',placeItems:'center',background:'var(--glass)',border:'1px solid var(--line)',color:'var(--txt-mid)',cursor:'pointer' }}>
            <MessageSquare size={18} strokeWidth={1.7} />
          </button>
        }
      />
      <div className="page-scroll">

        <ContractSwitcher apps={clientApps} selectedId={id} onSelect={(newId) => nav(`/admin/apps/${newId}`)} />

        {/* Client profile */}
        {client && (
          <GlassCard style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily:'var(--disp)', fontWeight:600, fontSize:18, color:'var(--gold-lite)',
                background:'var(--navy-700)', border:'1px solid var(--line)', flexShrink:0,
              }}>
                {client.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div className="h-title" style={{ fontSize: 18 }}>{client.name}</div>
                <div className="faint" style={{ fontSize: 11.5 }}>{client.address}</div>
              </div>
            </div>
            <Divider />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><div className="faint" style={{ fontSize: 10.5 }}>Телефон</div><div style={{ fontSize: 13, marginTop: 3 }}>{client.phone}</div></div>
              <div><div className="faint" style={{ fontSize: 10.5 }}>Инвестор</div><div style={{ fontSize: 13, marginTop: 3 }}>{investor?.name ?? '—'}</div></div>
            </div>
          </GlassCard>
        )}

        {/* Client documents */}
        {client && (
          <GlassCard style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Документы клиента</div>
            <DocumentUploader
              docs={client.documents ?? []}
              dir={`documents/${ownerId ?? app.ownerId}/clients/${client.id}`}
              onChange={onClientDocsChange}
              label="Добавить документ клиента"
            />
          </GlassCard>
        )}

        {/* Client access */}
        {client && (
          <GlassCard style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Доступ клиента</div>
            {client.login && client.password ? (
              <CredentialsBox login={client.login} password={client.password} />
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--txt-lo)' }}>Доступ ещё не выдан</div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {client.login ? (
                <button onClick={resetClientPassword} disabled={credBusy || !client.password}
                  style={accessBtn(credBusy || !client.password)}>
                  <RefreshCw size={14} strokeWidth={1.8} />
                  {credBusy ? 'Сброс...' : 'Сбросить пароль'}
                </button>
              ) : (
                <button onClick={grantClientAccess} disabled={credBusy} style={accessBtn(credBusy)}>
                  <KeyRound size={14} strokeWidth={1.8} />
                  {credBusy ? 'Создание...' : 'Выдать доступ'}
                </button>
              )}
            </div>
          </GlassCard>
        )}

        {/* Loan summary */}
        <GlassCard gold style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Сводка</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div className="faint" style={{ fontSize: 11 }}>Основной долг</div>
              <div className="num" style={{ fontSize: 28, fontWeight: 600 }}>{fmt(app.amount)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="faint" style={{ fontSize: 11 }}>{app.product}</div>
              <div className="num" style={{ fontSize: 14, color: 'var(--gold-lite)' }}>
                {app.term} мес · {app.percent}%
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Contract */}
        {client && (
          <GlassCard style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Договор</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => openContract(contractArgs())} style={contractBtn(false)}>
                <FileText size={14} strokeWidth={1.8} /> Открыть
              </button>
              <button onClick={() => downloadContract(contractArgs())} style={contractBtn(true)}>
                <Download size={14} strokeWidth={1.8} /> Скачать
              </button>
            </div>
          </GlassCard>
        )}

        {/* Application documents */}
        <GlassCard style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Документы по заявке</div>
          <DocumentUploader
            docs={app.documents ?? []}
            dir={`documents/${ownerId ?? app.ownerId}/applications/${id}`}
            onChange={onAppDocsChange}
            label="Прикрепить документ"
          />
        </GlassCard>

        {/* Payment schedule */}
        <GlassCard style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="h-title" style={{ fontSize: 15 }}>График платежей</div>
            <span className="faint" style={{ fontSize: 11 }}>оплачено {paidCount} из {payments.length}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr>
                {['№','Дата','Сумма','Статус',''].map(h => (
                  <th key={h} style={{ textAlign:'left', fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--txt-faint)', fontWeight:600, paddingBottom:10 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td style={{ padding:'11px 0', borderTop:'1px solid var(--line)', color:'var(--txt-mid)', fontFamily:'var(--disp)' }}>{p.n}</td>
                  <td style={{ padding:'11px 0', borderTop:'1px solid var(--line)', color:'var(--txt-mid)' }}>{p.date}</td>
                  <td style={{ padding:'11px 0', borderTop:'1px solid var(--line)', fontFamily:'var(--disp)', color: p.paidAmount != null && p.paidAmount < p.amount ? 'var(--warn, #E6A817)' : 'var(--txt-hi)' }}>
                    {p.status === 'paid' && p.paidAmount != null
                      ? <>{p.paidAmount.toLocaleString('ru-RU')} <span style={{ color:'var(--txt-lo)', fontSize:10 }}>из {p.amount.toLocaleString('ru-RU')}</span></>
                      : p.amount?.toLocaleString('ru-RU')
                    }
                  </td>
                  <td style={{ padding:'11px 0', borderTop:'1px solid var(--line)' }}><StatusPill status={p.status} /></td>
                  <td style={{ padding:'11px 0', borderTop:'1px solid var(--line)', textAlign:'right' }}>
                    {p.status !== 'paid' && (
                      <button
                        onClick={() => openPayModal(p)}
                        title="Внести платёж"
                        style={{
                          width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(91,212,154,.35)',
                          background: 'rgba(91,212,154,.08)', color: 'var(--ok)',
                          display: 'grid', placeItems: 'center', cursor: 'pointer',
                        }}
                      >
                        <CheckCircle2 size={14} strokeWidth={1.8} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>

        {/* ROI calc */}
        <GlassCard style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Расчёт</div>
          <KV k="Основной долг"    v={fmt(app.amount)} />
          {app.downPayment > 0 && (
            <>
              <KV k="Первоначальный взнос" v={fmt(app.downPayment)} />
              <KV k="Профинансировано"     v={fmt(app.amount - app.downPayment)} />
            </>
          )}
          <KV k="Итого к возврату" v={fmt(app.total ?? 0)} />
          <KV k="Наценка"          v={`${app.percent}%`} />
          <Divider style={{ margin: '8px 0' }} />
          <KV k={`Получено (${paidCount} платеж.)`} v={`+${fmt(earned)}`} vStyle={{ color: 'var(--gold-lite)' }} />
        </GlassCard>

        {/* Status */}
        <GlassCard style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Статус заявки</span>
          <StatusPill status={app.status} />
        </GlassCard>

        {/* Delete */}
        <button onClick={() => {
          Modal.confirm({
            title: 'Удалить заявку?',
            content: 'Заявка будет скрыта из списков. Восстановить может супер-админ.',
            okText: 'Удалить', okType: 'danger', cancelText: 'Отмена', centered: true,
            onOk: async () => {
              try {
                await softDelete('applications', id, myUid);
                message.success('Заявка удалена');
                nav('/admin/apps');
              } catch (e) { message.error('Ошибка: ' + (e.message ?? e)); }
            },
          });
        }}
          style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 13, fontWeight: 600, padding: '12px', borderRadius: 12, cursor: 'pointer',
            background: 'rgba(240,104,106,.08)', border: '1px solid rgba(240,104,106,.25)', color: 'var(--bad)' }}>
          Удалить заявку
        </button>
      </div>

      {/* Payment modal */}
      <Modal
        open={!!modalPayment}
        title={`Платёж №${modalPayment?.n} · ${modalPayment?.date}`}
        okText="Принять"
        cancelText="Отмена"
        confirmLoading={submitting}
        onOk={submitPayment}
        onCancel={closePayModal}
        centered
      >
        {modalPayment && (
          <div style={{ paddingTop: 8 }}>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.45)', marginBottom: 14 }}>
              Плановая сумма: <strong style={{ color: 'rgba(255,255,255,.75)', fontFamily: 'var(--disp)' }}>{fmt(modalPayment.amount)}</strong>
              &nbsp;· Введите фактически внесённую сумму
            </div>
            <Input
              ref={inputRef}
              size="large"
              suffix="₽"
              value={inputAmount}
              onChange={e => setInputAmount(e.target.value.replace(/\D/g, ''))}
              onPressEnter={submitPayment}
              placeholder="Введите сумму"
            />
            {(() => {
              const entered = parseInt(inputAmount, 10);
              if (!entered || entered === modalPayment.amount) return null;
              const future = payments.filter(p => p.id !== modalPayment.id && p.status !== 'paid');
              if (entered < modalPayment.amount) {
                const shortage = modalPayment.amount - entered;
                const perPay = future.length ? Math.ceil(shortage / future.length) : 0;
                return (
                  <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(230,168,23,.08)', border: '1px solid rgba(230,168,23,.25)', fontSize: 12.5, color: 'rgba(230,168,23,.9)' }}>
                    Недостача {fmt(shortage)} · будет добавлена к каждому из {future.length} оставш. платежей (+{fmt(perPay)})
                  </div>
                );
              }
              return (
                <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(91,212,154,.08)', border: '1px solid rgba(91,212,154,.2)', fontSize: 12.5, color: 'var(--ok)' }}>
                  Переплата {fmt(entered - modalPayment.amount)} · будет вычтена из оставшихся платежей
                </div>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* Message to client modal */}
      <Modal
        open={msgOpen}
        title={`Сообщение клиенту${client ? ` · ${client.name}` : ''}`}
        okText="Отправить"
        cancelText="Отмена"
        confirmLoading={sending}
        onOk={sendMessage}
        onCancel={() => setMsgOpen(false)}
        centered
      >
        <div style={{ paddingTop: 8, paddingBottom: 26 }}>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.45)', marginBottom: 12 }}>
            Сообщение появится в уведомлениях клиента.
          </div>
          <Input.TextArea
            value={msgText}
            onChange={e => setMsgText(e.target.value)}
            rows={4}
            maxLength={500}
            showCount
            placeholder="Например: напоминаем о платеже до 15 числа..."
          />
        </div>
      </Modal>
    </div>
  );
}

function accessBtn(disabled) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    fontSize: 12, fontWeight: 600, padding: '8px 13px', borderRadius: 10,
    background: 'var(--glass)', border: '1px solid var(--line)',
    color: disabled ? 'var(--txt-faint)' : 'var(--txt-mid)',
    cursor: disabled ? 'default' : 'pointer',
  };
}

function contractBtn(secondary) {
  return {
    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    fontSize: 12, fontWeight: 600, padding: '10px 13px', borderRadius: 10, cursor: 'pointer',
    background: secondary ? 'var(--glass)' : 'rgba(91,212,154,.1)',
    border: `1px solid ${secondary ? 'var(--line)' : 'rgba(91,212,154,.35)'}`,
    color: secondary ? 'var(--txt-mid)' : 'var(--ok)',
  };
}
