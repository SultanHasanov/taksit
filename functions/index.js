const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();
const db   = admin.firestore();
const auth = admin.auth();

// ── setUserRole ───────────────────────────────────────────────────────────────
// Callable by admin: sets custom claim + Firestore role
exports.setUserRole = onCall({ region: 'europe-west1' }, async (request) => {
  const { uid, role } = request.data;
  const caller = request.auth;
  if (!caller) throw new HttpsError('unauthenticated', 'Not authenticated');

  // Verify caller is admin
  const callerDoc = await db.collection('users').doc(caller.uid).get();
  if (callerDoc.data()?.role !== 'admin') throw new HttpsError('permission-denied', 'Admins only');

  await auth.setCustomUserClaims(uid, { role });
  await db.collection('users').doc(uid).set({ role }, { merge: true });
  return { success: true };
});

// ── createInvestorAccount ─────────────────────────────────────────────────────
// Creates Firebase Auth user for an investor, links to investors/{id}
exports.createInvestorAccount = onCall({ region: 'europe-west1' }, async (request) => {
  const { name, email, password, contact, note } = request.data;
  const caller = request.auth;
  if (!caller) throw new HttpsError('unauthenticated', 'Not authenticated');

  const callerDoc = await db.collection('users').doc(caller.uid).get();
  if (callerDoc.data()?.role !== 'admin') throw new HttpsError('permission-denied', 'Admins only');

  // Create Auth user
  let userRecord;
  try {
    userRecord = await auth.createUser({ email, password, displayName: name });
  } catch (e) {
    throw new HttpsError('already-exists', e.message);
  }

  await auth.setCustomUserClaims(userRecord.uid, { role: 'investor' });

  // Create user document
  await db.collection('users').doc(userRecord.uid).set({
    name, email, role: 'investor', createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Create investor document
  const invRef = await db.collection('investors').add({
    name, contact: contact ?? '', note: note ?? '',
    uid: userRecord.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { uid: userRecord.uid, investorId: invRef.id };
});

// ── computeSchedule ───────────────────────────────────────────────────────────
// Called when creating an application to generate the payment schedule
exports.computeSchedule = onCall({ region: 'europe-west1' }, async (request) => {
  const { applicationId } = request.data;
  const caller = request.auth;
  if (!caller) throw new HttpsError('unauthenticated', 'Not authenticated');

  const appDoc = await db.collection('applications').doc(applicationId).get();
  if (!appDoc.exists) throw new HttpsError('not-found', 'Application not found');

  const app = appDoc.data();
  const { amount, term, percent, fundedFromDate } = app;
  const markup     = percent / 100;
  const commission = 0.02;
  const total      = amount * (1 + markup * (term / 12) + commission);
  const monthly    = Math.round(total / term);

  const start = fundedFromDate ? new Date(fundedFromDate) : new Date();
  const batch = db.batch();

  for (let i = 0; i < term; i++) {
    const date = new Date(start);
    date.setMonth(date.getMonth() + i + 1);
    const body   = Math.round(amount / term);
    const profit = monthly - body;
    const ref    = db.collection(`applications/${applicationId}/payments`).doc();
    batch.set(ref, {
      n:       String(i + 1).padStart(2, '0'),
      date:    date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      dateIso: date.toISOString(),
      body, profit, amount: monthly,
      status:  'due',
    });
  }

  await batch.commit();
  await db.collection('applications').doc(applicationId).update({
    total: Math.round(total), monthly, status: 'active',
  });

  return { total: Math.round(total), monthly };
});
