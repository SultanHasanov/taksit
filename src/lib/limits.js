// Лимиты тарифа и их проверка перед созданием сущностей.
// Эффективный лимит = лимит тарифа + сумма купленных аддонов нужного типа.
// Лимит 0 трактуется как «без ограничений».

import { getDocument, getCollection, where } from '../firebase/db';

const TARGET_COLLECTION = {
  clients: 'clients',
  investors: 'investors',
  applications: 'applications',
};

const TARGET_LIMIT_KEY = {
  clients: 'maxClients',
  investors: 'maxInvestors',
  applications: 'maxApplications',
};

const TARGET_LABEL = {
  clients: 'клиентов',
  investors: 'инвесторов',
  applications: 'заявок',
};

/**
 * Загружает подписку админа + тариф. Возвращает { subscription, tariff } или null.
 */
export async function loadSubscription(adminUid) {
  const subscription = await getDocument('subscriptions', adminUid);
  if (!subscription) return { subscription: null, tariff: null };
  const tariff = subscription.tariffId ? await getDocument('tariffs', subscription.tariffId) : null;
  return { subscription, tariff };
}

/**
 * Эффективный лимит по типу (clients/investors/applications) с учётом аддонов.
 * Возвращает число (0 = безлимит) или Infinity, если тариф не задан.
 */
export function effectiveLimit(subscription, tariff, target) {
  if (!tariff) return Infinity; // нет тарифа — не ограничиваем (демо/легаси)
  const base = tariff.limits?.[TARGET_LIMIT_KEY[target]] ?? 0;
  if (base === 0) return Infinity; // 0 = безлимит
  const addonExtra = (subscription?.purchasedAddons ?? [])
    .filter(a => a.target === target && (a.status ?? 'active') === 'active')
    .reduce((s, a) => s + (a.extra ?? 0), 0);
  return base + addonExtra;
}

/**
 * Текущее число НЕудалённых сущностей данного типа у админа.
 */
export async function currentCount(adminUid, target) {
  const rows = await getCollection(TARGET_COLLECTION[target], [where('ownerId', '==', adminUid)]);
  return rows.filter(r => !r.deleted).length;
}

/**
 * Проверка перед созданием. Возвращает { ok, limit, count, label }.
 * ok=false — лимит достигнут.
 */
export async function checkLimit(adminUid, target) {
  if (!adminUid) return { ok: true };
  const { subscription, tariff } = await loadSubscription(adminUid);
  const limit = effectiveLimit(subscription, tariff, target);
  if (limit === Infinity) return { ok: true, limit, label: TARGET_LABEL[target] };
  const count = await currentCount(adminUid, target);
  return { ok: count < limit, limit, count, label: TARGET_LABEL[target] };
}

export function hasPending(sub) {
  return sub?.status === 'pending' ||
    (sub?.purchasedAddons ?? []).some(a => (a.status ?? 'active') === 'pending');
}

export { TARGET_LABEL };
