import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './config';

export { serverTimestamp, Timestamp };

// ── generic helpers ───────────────────────────────────────────────────────────

export const getDocument = async (path, id) => {
  const snap = await getDoc(doc(db, path, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getCollection = async (path, constraints = []) => {
  const q = constraints.length ? query(collection(db, path), ...constraints) : collection(db, path);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addDocument = (path, data) =>
  addDoc(collection(db, path), { ...data, createdAt: serverTimestamp() });

export const setDocument = (path, id, data) =>
  setDoc(doc(db, path, id), { ...data, updatedAt: serverTimestamp() }, { merge: true });

export const updateDocument = (path, id, data) =>
  updateDoc(doc(db, path, id), { ...data, updatedAt: serverTimestamp() });

export const deleteDocument = (path, id) => deleteDoc(doc(db, path, id));

export const subscribeCollection = (path, constraints, cb) => {
  const q = constraints.length ? query(collection(db, path), ...constraints) : collection(db, path);
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
};

export const subscribeDoc = (path, id, cb) =>
  onSnapshot(doc(db, path, id), snap =>
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null));

// Sort newest-first in JS so a `where` + `orderBy(createdAt)` query does not
// require a Firestore composite index. createdAt may be a Timestamp, an ISO
// string, or missing.
const tsToMillis = (v) =>
  v == null ? 0
  : typeof v === 'string' ? (Date.parse(v) || 0)
  : typeof v.toMillis === 'function' ? v.toMillis()
  : typeof v.seconds === 'number' ? v.seconds * 1000
  : 0;
export const byCreatedAtDesc = (a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt);

// ── domain-specific ────────────────────────────────────────────────────────────

export const getClients = () => getCollection('clients', [orderBy('name')]);
export const getInvestors = () => getCollection('investors', [orderBy('name')]);
export const getApplications = (constraints = []) => getCollection('applications', constraints);
// Filter by investor only (no composite index needed), sort by date client-side.
export const getExpenses = async (investorId) => {
  const rows = await getCollection('expenses', [where('investorId', '==', investorId)]);
  return rows.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
};

export const getPayments = async (applicationId) => {
  const snap = await getDocs(
    query(collection(db, `applications/${applicationId}/payments`), orderBy('n'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addPayment = (applicationId, data) =>
  addDoc(collection(db, `applications/${applicationId}/payments`), data);

// ── multi-tenancy: скоуп по владельцу (admin uid) + фильтр soft-delete ─────────
// Фильтр `deleted` делаем в JS, чтобы старые документы без поля не выпадали.
const notDeleted = (rows) => rows.filter(r => !r.deleted);

export const getOwnedClients = (ownerId) =>
  getCollection('clients', [where('ownerId', '==', ownerId)])
    .then(rows => notDeleted(rows).sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''))));

export const getOwnedInvestors = (ownerId) =>
  getCollection('investors', [where('ownerId', '==', ownerId)])
    .then(rows => notDeleted(rows).sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''))));

export const getOwnedApplications = (ownerId) =>
  getCollection('applications', [where('ownerId', '==', ownerId)]).then(notDeleted);

// ── soft delete / restore ──────────────────────────────────────────────────────
export const softDelete = (path, id, byUid) =>
  updateDocument(path, id, { deleted: true, deletedAt: serverTimestamp(), deletedBy: byUid ?? null });

export const restore = (path, id) =>
  updateDocument(path, id, { deleted: false, deletedAt: null, deletedBy: null });

// Каскад: помечаем сущность + все её заявки. byUid — кто удалил.
export const softDeleteClientCascade = async (clientId, byUid) => {
  const apps = await getCollection('applications', [where('clientId', '==', clientId)]);
  await Promise.all(apps.map(a => softDelete('applications', a.id, byUid)));
  await softDelete('clients', clientId, byUid);
};

export const softDeleteInvestorCascade = async (investorId, byUid) => {
  const apps = await getCollection('applications', [where('investorId', '==', investorId)]);
  await Promise.all(apps.map(a => softDelete('applications', a.id, byUid)));
  await softDelete('investors', investorId, byUid);
};

export const restoreClientCascade = async (clientId) => {
  const apps = await getCollection('applications', [where('clientId', '==', clientId)]);
  await Promise.all(apps.map(a => restore('applications', a.id)));
  await restore('clients', clientId);
};

export const restoreInvestorCascade = async (investorId) => {
  const apps = await getCollection('applications', [where('investorId', '==', investorId)]);
  await Promise.all(apps.map(a => restore('applications', a.id)));
  await restore('investors', investorId);
};

// ── exports for constraints and raw ops ───────────────────────────────────────
export { where, orderBy, limit, query, collection, doc, addDoc, updateDoc, db };
