# TAKSIT — Мобильное PWA для финансирования рассрочки

React + Vite + Ant Design + Firebase. Три роли: **Админ**, **Инвестор**, **Клиент**.

---

## Быстрый старт

### 1. Создать Firebase проект

1. Перейти на [console.firebase.google.com](https://console.firebase.google.com)
2. Создать новый проект
3. Включить **Authentication → Email/Password**
4. Включить **Firestore Database** (тестовый режим)
5. Включить **Storage**
6. Добавить **Web App** и скопировать конфиг

### 2. Настроить переменные окружения

```bash
cp .env.local.example .env.local
```

Заполнить `.env.local` данными Firebase и токеном DaData:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_DADATA_TOKEN=...   # https://dadata.ru — бесплатный токен
```

### 3. Установить зависимости и запустить

```bash
npm install
npm run dev
```

### 4. Залить демо-данные в Firestore

Открыть DevTools → Console и выполнить:

```js
const { seed } = await import('/src/firebase/seed.js');
await seed();
```

**Демо-аккаунты:**
| Роль | Email | Пароль |
|------|-------|--------|
| Админ | admin@taksit.ru | demo1234 |
| Инвестор | investor@taksit.ru | demo1234 |
| Клиент | client@taksit.ru | demo1234 |

---

## Сборка

```bash
npm run build
npm run preview
```

---

## Cloud Functions (опционально, требует Blaze план)

```bash
cd functions && npm install
firebase deploy --only functions
```

Функции: `setUserRole`, `createInvestorAccount`, `computeSchedule`

---

## Структура

```
src/
  theme/          CSS-переменные (navy/gold) + тема Antd
  firebase/       config, auth, db, seed
  context/        AuthContext
  router/         маршруты + RoleGuard
  layout/         AppShell, BottomNav, TopBar
  components/     GlassCard, StatCard, Ring, Timeline, VBars ...
  hooks/          useCollection, useDoc, usePaymentSchedule
  lib/            format.js, computeSchedule
  pages/
    Login.jsx
    admin/        Dashboard, NewApplication, Clients, Applications,
                  Investors, Expenses, Reports, ApplicationDetail
    investor/     Portfolio, ApplicationDetail, Returns, Profile
    client/       Home, Schedule, History, Profile
functions/        Cloud Functions Node 20
```

---

## Бизнес-логика

- Процент вводится вручную при создании заявки
- График: `total = amount × (1 + percent/100 × term/12 + 0.02)`
- Инвесторы создаются админом и привязываются к заявкам
- Расходы привязаны к инвестору (бензин, обед, аренда и т.д.)
- Адрес клиента с автоподсказками через DaData API
