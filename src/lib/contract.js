import pdfMake from 'pdfmake/build/pdfmake';
import { computeSchedule, fmt, fmtDate, dayjs } from './format';

// Load vfs fonts lazily to avoid blocking the main bundle
let vfsLoaded = false;
async function ensureVfs() {
  if (vfsLoaded) return;
  const vfs = await import('pdfmake/build/vfs_fonts');
  pdfMake.vfs = vfs.default?.pdfMake?.vfs ?? vfs.pdfMake?.vfs ?? vfs.default?.vfs ?? vfs.vfs ?? {};
  vfsLoaded = true;
}

function buildDef({ app, client, investor, ownerName, payments }) {
  const schedule = payments?.length
    ? payments
    : computeSchedule(app.amount, app.term, app.percent, app.fundedFromDate, app.downPayment).payments;

  const financed = Math.max(0, (app.amount || 0) - (app.downPayment || 0));
  const dateNow = dayjs().format('D MMMM YYYY г.');
  const fundedDate = app.fundedFromDate ? fmtDate(app.fundedFromDate) : '—';

  const tableBody = [
    [
      { text: '№', style: 'thCell' },
      { text: 'Дата', style: 'thCell' },
      { text: 'Тело долга', style: 'thCell' },
      { text: 'Наценка', style: 'thCell' },
      { text: 'Сумма', style: 'thCell' },
    ],
    ...schedule.map(p => [
      { text: p.n, style: 'tdCell' },
      { text: p.date, style: 'tdCell' },
      { text: (p.body ?? 0).toLocaleString('ru-RU'), style: 'tdCell' },
      { text: (p.profit ?? 0).toLocaleString('ru-RU'), style: 'tdCell' },
      { text: (p.amount ?? 0).toLocaleString('ru-RU'), style: 'tdCellBold' },
    ]),
  ];

  return {
    pageSize: 'A4',
    pageMargins: [50, 60, 50, 60],
    defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.4, color: '#1a1a2e' },
    styles: {
      h1:        { fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
      h2:        { fontSize: 13, bold: true, margin: [0, 14, 0, 6] },
      label:     { fontSize: 10, color: '#666', margin: [0, 0, 0, 2] },
      thCell:    { fontSize: 9, bold: true, fillColor: '#e8e8f0', margin: [4, 4, 4, 4] },
      tdCell:    { fontSize: 10, margin: [4, 3, 4, 3] },
      tdCellBold:{ fontSize: 10, bold: true, margin: [4, 3, 4, 3] },
      sign:      { margin: [0, 40, 0, 0] },
    },
    content: [
      { text: 'ДОГОВОР РАССРОЧКИ', style: 'h1' },
      { text: `г. [Город], ${dateNow}`, alignment: 'center', margin: [0, 0, 0, 16], fontSize: 10 },

      { text: '1. СТОРОНЫ ДОГОВОРА', style: 'h2' },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Кредитор (Организация):', style: 'label' },
              { text: ownerName || '—', bold: true },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Покупатель (Клиент):', style: 'label' },
              { text: client?.name || '—', bold: true },
              { text: client?.phone ? `Тел: ${client.phone}` : '', fontSize: 10, color: '#555' },
              { text: client?.address ? `Адрес: ${client.address}` : '', fontSize: 10, color: '#555' },
            ],
          },
        ],
        margin: [0, 0, 0, 10],
      },
      investor?.name && {
        stack: [
          { text: 'Инвестор:', style: 'label' },
          { text: investor.name, fontSize: 11 },
        ],
        margin: [0, 0, 0, 14],
      },

      { text: '2. ПРЕДМЕТ ДОГОВОРА', style: 'h2' },
      { text: `Товар / услуга: ${app.product || '—'}` },
      app.address && { text: `Адрес доставки / нахождения: ${app.address}`, margin: [0, 2, 0, 0] },

      { text: '3. ФИНАНСОВЫЕ УСЛОВИЯ', style: 'h2' },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              { text: 'Полная стоимость', style: 'label' },
              { text: 'Первоначальный взнос', style: 'label' },
            ],
            [
              { text: fmt(app.amount || 0), bold: true, fontSize: 13 },
              { text: fmt(app.downPayment || 0), bold: true, fontSize: 13 },
            ],
            [
              { text: 'Сумма финансирования', style: 'label' },
              { text: 'Наценка', style: 'label' },
            ],
            [
              { text: fmt(financed), bold: true },
              { text: `${app.percent || 0}%`, bold: true },
            ],
            [
              { text: 'Срок рассрочки', style: 'label' },
              { text: 'Ежемесячный платёж', style: 'label' },
            ],
            [
              { text: `${app.term || 0} месяцев`, bold: true },
              { text: fmt(app.monthly || 0), bold: true },
            ],
            [
              { text: 'Итого к возврату', style: 'label' },
              { text: 'Дата начала рассрочки', style: 'label' },
            ],
            [
              { text: fmt(app.total || 0), bold: true, color: '#1a4a8a' },
              { text: fundedDate, bold: true },
            ],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 14],
      },

      { text: '4. ГРАФИК ПЛАТЕЖЕЙ', style: 'h2' },
      {
        table: {
          headerRows: 1,
          widths: [30, '*', '*', '*', '*'],
          body: tableBody,
        },
        layout: {
          hLineWidth: (i) => (i === 0 || i === 1) ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#cccccc',
          vLineColor: () => '#cccccc',
        },
        margin: [0, 0, 0, 20],
      },

      { text: '5. ПОДПИСИ СТОРОН', style: 'h2' },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Кредитор:', style: 'label' },
              { text: ownerName || '—', margin: [0, 0, 0, 30] },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5 }] },
              { text: 'Подпись / печать', style: 'label', margin: [0, 4, 0, 0] },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Покупатель:', style: 'label' },
              { text: client?.name || '—', margin: [0, 0, 0, 30] },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5 }] },
              { text: 'Подпись', style: 'label', margin: [0, 4, 0, 0] },
            ],
          },
        ],
      },
    ].filter(Boolean),
  };
}

export async function openContract(args) {
  await ensureVfs();
  pdfMake.createPdf(buildDef(args)).open();
}

export async function downloadContract(args) {
  await ensureVfs();
  const clientName = args.client?.name?.replace(/\s+/g, '_') ?? 'Клиент';
  pdfMake.createPdf(buildDef(args)).download(`Договор_${clientName}.pdf`);
}
