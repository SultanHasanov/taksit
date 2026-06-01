// Utilities for creating/resetting user accounts from admin UI.
// For clients/investors we still use a secondary Firebase auth instance
// so that creating accounts does not switch out the current admin session.

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app as primaryApp, db } from './config';
import { genLogin, genAdminLogin, genPassword, toAuthEmail } from '../lib/credentials';

const SECONDARY_NAME = 'admin-user-creator';

function secondaryAuth() {
  const existing = getApps().find((a) => a.name === SECONDARY_NAME);
  if (existing) return getAuth(existing);
  const app = initializeApp(primaryApp.options, SECONDARY_NAME);
  return initializeAuth(app, { persistence: inMemoryPersistence });
}

export async function createUserAccount({ name, email, password, role, extra = {} }) {
  const auth2 = secondaryAuth();
  const cred = await createUserWithEmailAndPassword(auth2, email, password);
  await setDoc(doc(db, 'users', cred.user.uid), {
    name,
    email,
    role,
    ...extra,
    createdAt: serverTimestamp(),
  });
  await signOut(auth2);
  return cred.user.uid;
}

export async function provisionAccount(name, role, extra = {}) {
  let lastErr;
  for (let i = 0; i < 5; i++) {
    const login = genLogin(name);
    const password = genPassword();
    try {
      const uid = await createUserAccount({ name, email: login, password, role, extra });
      return { uid, login, password };
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        lastErr = e;
        continue;
      }
      throw e;
    }
  }
  throw lastErr ?? new Error('Failed to create account');
}

// Создание админа целиком на клиенте (без Cloud Functions): вторичный auth-инстанс
// создаёт аккаунт, не разлогинивая суперадмина. Логин/пароль сохраняются в users/{uid},
// чтобы суперадмин видел их всегда. Параллельно создаётся подписка в статусе «ожидает оплаты».
export async function provisionAdminAccount(name, { tariffId, password } = {}) {
  const auth2 = secondaryAuth();
  const finalPassword = (password && String(password).trim()) || genPassword();

  let lastErr;
  for (let i = 0; i < 5; i++) {
    const login = genAdminLogin(name);
    const authEmail = toAuthEmail(login);
    try {
      const cred = await createUserWithEmailAndPassword(auth2, authEmail, finalPassword);
      const uid = cred.user.uid;

      await setDoc(doc(db, 'users', uid), {
        name,
        email: authEmail,
        login,
        password: finalPassword,
        role: 'admin',
        signupSource: 'manual_superadmin',
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'subscriptions', uid), {
        adminId: uid,
        tariffId,
        status: 'pending',
        startedAt: serverTimestamp(),
        nextPaymentDate: null,
        purchasedAddons: [],
        updatedAt: serverTimestamp(),
      });

      await signOut(auth2);
      return { uid, login, password: finalPassword };
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        lastErr = e;
        continue;
      }
      throw e;
    }
  }
  throw lastErr ?? new Error('Failed to create admin account');
}

export async function resetUserPassword({ email, oldPassword }) {
  const auth2 = secondaryAuth();
  const cred = await signInWithEmailAndPassword(auth2, email, oldPassword);
  const newPassword = genPassword();
  await updatePassword(cred.user, newPassword);
  await signOut(auth2);
  return newPassword;
}
