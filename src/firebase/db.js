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

// ── exports for constraints and raw ops ───────────────────────────────────────
export { where, orderBy, limit, query, collection, doc, addDoc, updateDoc, db };
