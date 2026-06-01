/**
 * Demo seed script.
 * Run from browser console: import('/src/firebase/seed.js').then(m => m.seed())
 * or add a temporary button in dev mode.
 */
import { setDoc, doc, collection, addDoc, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from './config';
import { computeSchedule, dayjs } from '../lib/format';

/**
 * Дата передачи средств так, чтобы СЛЕДУЮЩИЙ неоплаченный платёж попадал на
 * `overdueDays` дней раньше сегодня (положит. = просрочка, отрицат. = ещё не наступил).
 * Дата след. платежа = fundedFromDate + (paidCount + 1) мес  ⇒  отсюда выводим fundedFromDate.
 */
function fundedDateFor(paidCount, overdueDays) {
  return dayjs()
    .subtract(overdueDays, 'day')
    .subtract(paidCount + 1, 'month')
    .format('YYYY-MM-DD');
}

const DEMO_SUPER    = { email: 'super@taksit.ru',    password: 'demo1234', name: 'Султан (владелец)', role: 'superadmin' };
const DEMO_ADMIN    = { email: 'admin@taksit.ru',    password: 'demo1234', name: 'Артур Самойлов',  role: 'admin' };
const DEMO_INVESTOR = { email: 'investor@taksit.ru', password: 'demo1234', name: 'Виктор Поляков',  role: 'investor' };
const DEMO_CLIENT   = { email: 'client@taksit.ru',   password: 'demo1234', name: 'Анна Соколова',   role: 'client' };

const clients = [
  { name: 'Анна Соколова',   phone: '+7 916 100 0001', address: 'Москва, ул. Тверская, 12' },
  { name: 'Дмитрий Орлов',   phone: '+7 916 100 0002', address: 'Москва, пр-т Мира, 45' },
  { name: 'Елена Морозова',  phone: '+7 916 100 0003', address: 'Москва, ул. Арбат, 7' },
  { name: 'Тимур Алиев',     phone: '+7 916 100 0004', address: 'Москва, ул. Ленина, 22' },
  { name: 'Ольга Кузнецова', phone: '+7 916 100 0005', address: 'Москва, ул. Садовая, 18' },
  { name: 'Артём Лебедев',   phone: '+7 916 100 0006', address: 'Москва, пр-т Победы, 3' },
  { name: 'Виктор Зайцев',   phone: '+7 916 100 0007', address: 'СПб, Невский пр-т, 99' },
  { name: 'Марина Беляева',  phone: '+7 916 100 0008', address: 'Москва, ул. Цветной б-р, 5' },
  { name: 'Павел Гусев',     phone: '+7 916 100 0009', address: 'Москва, Кутузовский пр-т, 11' },
];

const investors = [
  { name: 'Виктор Поляков', contact: '+7 916 200 0001', note: 'Основной инвестор' },
  { name: 'Ирина Сафонова', contact: '+7 916 200 0002', note: 'Второй инвестор' },
];

const expenses = [
  { title: 'Бензин', amount: 2500, note: 'Поездки к клиентам', date: '2025-05-10' },
  { title: 'Обед с клиентом', amount: 3200, note: 'Кафе на Арбате', date: '2025-05-12' },
  { title: 'Аренда офиса', amount: 25000, note: 'Май 2025', date: '2025-05-01' },
  { title: 'Канцтовары', amount: 1800, note: '', date: '2025-05-15' },
];

/**
 * Wipe a top-level collection. If a `subcollections` array is given, each
 * document's named subcollections are deleted first (Firestore does not
 * cascade-delete subcollections when the parent doc is removed).
 */
async function clearCollection(path, subcollections = []) {
  const snap = await getDocs(collection(db, path));
  for (const d of snap.docs) {
    for (const sub of subcollections) {
      const subSnap = await getDocs(collection(db, `${path}/${d.id}/${sub}`));
      for (const s of subSnap.docs) await deleteDoc(s.ref);
    }
    await deleteDoc(d.ref);
  }
  console.log(`  cleared ${path} (${snap.size} docs)`);
}

async function clearAll() {
  console.log('🧹 Clearing existing data...');
  await clearCollection('applications', ['payments']);
  await clearCollection('clients');
  await clearCollection('investors');
  await clearCollection('expenses');
  await clearCollection('notifications');
  // Note: `users` docs are keyed by auth UID and left intact so existing
  // Authentication accounts keep their profiles. seed() rewrites them anyway.
}

async function createOrGetUser(email, password, name, role, extra = {}) {
  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    uid = cred.user.uid;
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      // Recover the existing UID by signing in, so the profile and any
      // UID links (e.g. investor.uid) stay correct on re-runs.
      const cred = await signInWithEmailAndPassword(auth, email, password);
      uid = cred.user.uid;
      console.log(`User ${email} already exists, reusing ${uid}.`);
    } else {
      throw e;
    }
  }
  await setDoc(doc(db, 'users', uid), { name, email, role, ...extra, createdAt: serverTimestamp() });
  return uid;
}

/**
 * Создаёт ТОЛЬКО аккаунт супер-админа (super@taksit.ru), ничего не удаляя.
 * Запуск из консоли браузера:
 *   import('/src/firebase/seed.js').then(m => m.seedSuperAdmin())
 */
export async function seedSuperAdmin() {
  const uid = await createOrGetUser(DEMO_SUPER.email, DEMO_SUPER.password, DEMO_SUPER.name, DEMO_SUPER.role);
  console.log(`✅ Супер-админ готов: ${DEMO_SUPER.email} / ${DEMO_SUPER.password} (uid ${uid})`);
  return uid;
}

export async function seed() {
  console.log('🌱 Seeding Firestore...');

  // Wipe previous data first so re-running never creates duplicates.
  await clearAll();

  // Users
  const superUid    = await createOrGetUser(DEMO_SUPER.email,    DEMO_SUPER.password,    DEMO_SUPER.name,    DEMO_SUPER.role);
  const adminUid    = await createOrGetUser(DEMO_ADMIN.email,    DEMO_ADMIN.password,    DEMO_ADMIN.name,    DEMO_ADMIN.role,
    { login: DEMO_ADMIN.email, password: DEMO_ADMIN.password });
  const investorUid = await createOrGetUser(DEMO_INVESTOR.email, DEMO_INVESTOR.password, DEMO_INVESTOR.name, DEMO_INVESTOR.role,
    { ownerId: adminUid });
  const clientUid   = await createOrGetUser(DEMO_CLIENT.email,   DEMO_CLIENT.password,   DEMO_CLIENT.name,   DEMO_CLIENT.role,
    { ownerId: adminUid });

  // Тарифы (настраиваются супер-админом, здесь — стартовый набор)
  await seedTariffsAndSubscription(adminUid);

  // Clients — первый (Анна Соколова) привязан к демо-аккаунту client@taksit.ru
  const clientIds = [];
  for (let i = 0; i < clients.length; i++) {
    const c = clients[i];
    const linked = i === 0;
    const ref = await addDoc(collection(db, 'clients'), {
      ...c,
      uid:      linked ? clientUid : null,
      login:    linked ? DEMO_CLIENT.email : null,
      password: linked ? DEMO_CLIENT.password : null,
      ownerId:  adminUid,
      deleted:  false,
      createdAt: serverTimestamp(),
    });
    clientIds.push(ref.id);
  }

  // Investors — первый привязан к демо-аккаунту investor@taksit.ru
  const investorIds = [];
  for (let i = 0; i < investors.length; i++) {
    const inv = investors[i];
    const linked = i === 0;
    const ref = await addDoc(collection(db, 'investors'), {
      ...inv,
      uid:      linked ? investorUid : null,
      login:    linked ? DEMO_INVESTOR.email : null,
      password: linked ? DEMO_INVESTOR.password : null,
      ownerId:  adminUid,
      deleted:  false,
      createdAt: serverTimestamp(),
    });
    investorIds.push(ref.id);
  }

  // Applications with payments.
  // paidCount = сколько платежей уже внесено; overdueDays задаёт просрочку
  // следующего неоплаченного платежа (>0 — просрочка, <0 — срок ещё не настал).
  const apps = [
    // В срок (следующий платёж через ~3 недели)
    { clientId: clientIds[0], investorId: investorIds[0], product: 'MacBook Pro 16″ M4',       category: 'Электроника', amount: 249000, term: 6,  percent: 12, address: 'Москва, ул. Тверская, 12',  status: 'active', paidCount: 2, overdueDays: -22 },
    // Просрочка 1–7 дней (жёлтый)
    { clientId: clientIds[1], investorId: investorIds[0], product: 'Лечение зубов',             category: 'Медицина',    amount: 590000, term: 9,  percent: 15, address: 'Москва, пр-т Мира, 45',      status: 'active', paidCount: 3, overdueDays: 4 },
    // Просрочка 8–30 дней (оранжевый)
    { clientId: clientIds[2], investorId: investorIds[0], product: 'Мебель для гостиной',       category: 'Мебель',      amount: 315000, term: 6,  percent: 12, address: 'Москва, ул. Арбат, 7',       status: 'active', paidCount: 2, overdueDays: 18 },
    // Просрочка 30+ дней (красный)
    { clientId: clientIds[3], investorId: investorIds[1], product: 'Лазерная коррекция зрения', category: 'Медицина',    amount: 420000, term: 6,  percent: 12, address: 'Москва, ул. Ленина, 22',     status: 'active', paidCount: 1, overdueDays: 52 },
    // В срок (платёж на днях)
    { clientId: clientIds[4], investorId: investorIds[0], product: 'iPhone 15 Pro',             category: 'Электроника', amount: 129000, term: 3,  percent: 10, address: 'Москва, ул. Садовая, 18',    status: 'active', paidCount: 1, overdueDays: -6 },
    // Закрытая заявка (полностью погашена)
    { clientId: clientIds[5], investorId: investorIds[1], product: 'Электровелосипед',          category: 'Спорт',       amount: 274000, term: 6,  percent: 12, address: 'Москва, пр-т Победы, 3',     status: 'closed', paidCount: 6, overdueDays: 0 },
    // Вторая заявка демо-клиента (Анна Соколова) — чтобы был виден переключатель договоров
    { clientId: clientIds[0], investorId: investorIds[0], product: 'Стиральная машина Bosch',   category: 'Техника',     amount: 89000,  term: 4,  percent: 10, address: 'Москва, ул. Тверская, 12',  status: 'active', paidCount: 1, overdueDays: -14 },
  ];

  for (const app of apps) {
    const { paidCount, overdueDays, ...appData } = app;
    const fundedFromDate = fundedDateFor(paidCount, overdueDays);
    const { payments, total, monthly } = computeSchedule(appData.amount, appData.term, appData.percent, fundedFromDate);
    const paymentsFinal = payments.map((p, i) => ({
      ...p,
      status: i < paidCount ? 'paid' : i === paidCount ? 'next' : 'due',
    }));

    const ref = await addDoc(collection(db, 'applications'), {
      ...appData, fundedFromDate, total, monthly,
      paidCount,
      ownerId: adminUid,
      deleted: false,
      createdAt: serverTimestamp(),
    });

    for (const p of paymentsFinal) {
      await addDoc(collection(db, `applications/${ref.id}/payments`), p);
    }
  }

  // Expenses for investor 0
  for (const e of expenses) {
    await addDoc(collection(db, 'expenses'), {
      ...e, investorId: investorIds[0], ownerId: adminUid, deleted: false, createdAt: serverTimestamp(),
    });
  }

  console.log('✅ Seed complete!');
  console.log('   Супер-админ: super@taksit.ru / demo1234');
  console.log('   Чтобы сделать супер-админом свой аккаунт — выставьте users/{uid}.role = "superadmin" в Firestore.');
}

/**
 * Стартовые тарифы, аддоны и подписка демо-админа. Перезаписывает документы
 * с фиксированными id, поэтому повторный запуск идемпотентен.
 */
async function seedTariffsAndSubscription(adminUid) {
  const tariffs = [
    { id: 'basic',    name: 'Базовый',  key: 'basic',    monthlyPrice: 2900,  order: 1, active: true,
      limits: { maxClients: 10,  maxInvestors: 2,  maxApplications: 20 },
      features: ['До 10 клиентов', 'До 2 инвесторов', 'Базовые отчёты'] },
    { id: 'standard', name: 'Стандарт', key: 'standard', monthlyPrice: 5900,  order: 2, active: true,
      limits: { maxClients: 50,  maxInvestors: 10, maxApplications: 100 },
      features: ['До 50 клиентов', 'До 10 инвесторов', 'Расширенные отчёты', 'Реферальная программа'] },
    { id: 'pro',      name: 'Про',      key: 'pro',      monthlyPrice: 11900, order: 3, active: true,
      limits: { maxClients: 0,   maxInvestors: 0,  maxApplications: 0 }, // 0 = без лимита
      features: ['Безлимит клиентов', 'Безлимит инвесторов', 'Приоритетная поддержка', 'Реферальная программа'] },
  ];
  for (const t of tariffs) {
    await setDoc(doc(db, 'tariffs', t.id), { ...t, createdAt: serverTimestamp() });
  }

  const addons = [
    { id: 'clients-10',   name: '+10 клиентов',   target: 'clients',      extra: 10, price: 1500, active: true },
    { id: 'investors-5',  name: '+5 инвесторов',  target: 'investors',    extra: 5,  price: 1200, active: true },
    { id: 'apps-50',      name: '+50 заявок',     target: 'applications', extra: 50, price: 2000, active: true },
  ];
  for (const a of addons) {
    await setDoc(doc(db, 'addons', a.id), { ...a, createdAt: serverTimestamp() });
  }

  // Подписка демо-админа — активна, следующий платёж через ~3 недели
  await setDoc(doc(db, 'subscriptions', adminUid), {
    adminId: adminUid,
    tariffId: 'standard',
    status: 'active',
    startedAt: serverTimestamp(),
    nextPaymentDate: dayjs().add(22, 'day').format('YYYY-MM-DD'),
    purchasedAddons: [],
    updatedAt: serverTimestamp(),
  });
}
