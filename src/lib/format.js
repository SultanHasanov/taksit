import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

export const fmt = (n) => Math.round(n).toLocaleString('ru-RU') + ' ₽';

export const fmtShort = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + ' млн ₽';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + ' тыс ₽';
  return fmt(n);
};

export const fmtDate = (d) => dayjs(d).format('D MMM YYYY');
export const fmtDateShort = (d) => dayjs(d).format('D MMM');
export const fmtDayjs = (d) => dayjs(d);

/**
 * Compute payment schedule.
 * @param {number} amount  - principal
 * @param {number} term    - months
 * @param {number} percent - markup % (e.g. 12 means 12%)
 * @param {Date|string} startDate - first payment date
 * @param {number} downPayment - первоначальный взнос (наценка идёт на остаток)
 */
export function computeSchedule(amount, term, percent, startDate, downPayment = 0) {
  const markup = percent / 100;
  const commission = 0.02;
  const principal = Math.max(0, amount - (downPayment || 0)); // финансируемая сумма
  const total = principal * (1 + markup * (term / 12) + commission);
  const monthly = total / term;

  const start = dayjs(startDate || new Date());
  const payments = [];
  for (let i = 0; i < term; i++) {
    const date = start.add(i + 1, 'month');
    const body = principal / term;
    const profit = monthly - body;
    payments.push({
      n: String(i + 1).padStart(2, '0'),
      date: date.format('D MMM'),
      dateIso: date.toISOString(),
      body: Math.round(body),
      profit: Math.round(profit),
      amount: Math.round(monthly),
      status: 'due',
    });
  }
  return { total: Math.round(total), monthly: Math.round(monthly), payments };
}

/**
 * Просрочка по заявке — производная величина (нигде не хранится).
 * Дата следующего неоплаченного платежа = fundedFromDate + (paidCount + 1) месяцев.
 * Если она в прошлом и заявка не закрыта/не погашена — клиент в просрочке.
 * Бакеты совпадают с фильтрами на странице «Клиенты»: ok / warn(1–7) / orange(8–30) / bad(30+).
 */
export function computeOverdue(app, asOf) {
  const today = dayjs(asOf || undefined).startOf('day');
  if (!app || app.status === 'closed') {
    return { days: 0, dot: 'ok', label: 'Закрыто', isOverdue: false };
  }
  const paid = app.paidCount ?? 0;
  const term = app.term ?? 0;
  if (paid >= term) {
    return { days: 0, dot: 'ok', label: 'Погашено', isOverdue: false };
  }
  const nextDue = dayjs(app.fundedFromDate || new Date()).add(paid + 1, 'month').startOf('day');
  const days = today.diff(nextDue, 'day');
  if (days <= 0)  return { days: 0,   dot: 'ok',     label: 'В срок',              isOverdue: false };
  if (days <= 7)  return { days,      dot: 'warn',   label: `просрочка ${days} дн`, isOverdue: true };
  if (days <= 30) return { days,      dot: 'orange', label: `просрочка ${days} дн`, isOverdue: true };
  return            { days,           dot: 'bad',    label: `просрочка ${days} дн`, isOverdue: true };
}

export { dayjs };
