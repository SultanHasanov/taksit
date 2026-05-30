// Генерация коротких учётных данных для инвесторов/клиентов.
// Логин для Firebase Auth обязан быть в формате email, поэтому короткий
// логин из имени дополняется фиксированным внутренним доменом.

export const LOGIN_DOMAIN = 'taksit.app';

const TRANSLIT = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh', з:'z', и:'i',
  й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t',
  у:'u', ф:'f', х:'h', ц:'c', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'',
  э:'e', ю:'yu', я:'ya',
};

function translit(str) {
  return str.toLowerCase().split('').map(ch => (ch in TRANSLIT ? TRANSLIT[ch] : ch)).join('');
}

/**
 * Короткий логин из имени: первая буква имени + фамилия + 2 случайные цифры.
 * «Виктор Поляков» → vpolyakov47@taksit.app
 */
export function genLogin(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? 'user';
  const last  = parts[1] ?? '';
  let base = translit((first[0] ?? '') + last).replace(/[^a-z0-9]/g, '');
  if (!base) base = 'user';
  if (base.length > 14) base = base.slice(0, 14);
  const digits = String(Math.floor(10 + Math.random() * 90)); // 2 цифры
  return `${base}${digits}@${LOGIN_DOMAIN}`;
}

/**
 * Короткий читаемый пароль из 7 символов без неоднозначных (0/o, 1/l/i).
 */
export function genPassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 7; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
