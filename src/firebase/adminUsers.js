// Создание и сброс учётных записей пользователей администратором.
//
// Ключевой нюанс: createUserWithEmailAndPassword на ОСНОВНОМ auth тут же
// логинит нового пользователя и выкидывает админа. Поэтому всё делаем на
// ВТОРИЧНОМ экземпляре Firebase — сессия админа не затрагивается.
//
// Сброс пароля чужому пользователю в клиентском SDK невозможен без повторного
// входа под ним, поэтому мы храним текущий пароль на документе и используем
// его, чтобы переавторизоваться и задать новый (resetUserPassword).

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, initializeAuth, inMemoryPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword, updatePassword, signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app as primaryApp, db } from './config';
import { genLogin, genPassword } from '../lib/credentials';

const SECONDARY_NAME = 'admin-user-creator';

// Вторичный инстанс с in-memory persistence: его сессия живёт только в памяти
// и не трогает сохранённую сессию админа в основном приложении.
function secondaryAuth() {
  const existing = getApps().find(a => a.name === SECONDARY_NAME);
  if (existing) return getAuth(existing);
  const app = initializeApp(primaryApp.options, SECONDARY_NAME);
  return initializeAuth(app, { persistence: inMemoryPersistence });
}

/**
 * Создаёт Firebase-аккаунт с заданным email/паролем, пишет профиль в users/{uid}.
 * Возвращает uid. Сессия админа не затрагивается.
 */
export async function createUserAccount({ name, email, password, role }) {
  const auth2 = secondaryAuth();
  const cred = await createUserWithEmailAndPassword(auth2, email, password);
  await setDoc(doc(db, 'users', cred.user.uid), {
    name, email, role, createdAt: serverTimestamp(),
  });
  await signOut(auth2);
  return cred.user.uid;
}

/**
 * Генерирует короткий логин+пароль и создаёт аккаунт. При коллизии логина
 * (email уже занят) пробует ещё раз с новым логином. Возвращает { uid, login, password }.
 */
export async function provisionAccount(name, role) {
  let lastErr;
  for (let i = 0; i < 5; i++) {
    const login = genLogin(name);
    const password = genPassword();
    try {
      const uid = await createUserAccount({ name, email: login, password, role });
      return { uid, login, password };
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') { lastErr = e; continue; }
      throw e;
    }
  }
  throw lastErr ?? new Error('Не удалось создать аккаунт');
}

/**
 * Сбрасывает пароль: переавторизуется под пользователем на вторичном инстансе
 * со старым паролем и задаёт новый. Возвращает новый пароль.
 */
export async function resetUserPassword({ email, oldPassword }) {
  const auth2 = secondaryAuth();
  const cred = await signInWithEmailAndPassword(auth2, email, oldPassword);
  const newPassword = genPassword();
  await updatePassword(cred.user, newPassword);
  await signOut(auth2);
  return newPassword;
}
