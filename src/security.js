// StockPilot Pro — socle sécurité frontend (défense en profondeur, zéro IPC Tauri).
// - Échappement XSS systématique via Sec.esc()
// - Validation des entrées, auth locale PBKDF2 + verrouillage, sessions 15 min, audit.
(() => {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64e = b => btoa(String.fromCharCode(...new Uint8Array(b)));
  const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer;

  const esc = v => String(v ?? '').replace(/[&<>"'`=]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '=': '&#61;'
  }[c]));
  const cleanStr = (v, max = 80) => String(v ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
  const toInt = (v, min, max, fb = 0) => {
    const n = Number.parseInt(v, 10);
    if (!Number.isFinite(n)) return fb;
    return Math.min(max, Math.max(min, n));
  };
  const toFloat = (v, min, max, fb = 0) => {
    const n = Number.parseFloat(String(v).replace(',', '.'));
    if (!Number.isFinite(n)) return fb;
    return Math.min(max, Math.max(min, n));
  };

  const UKEY = 'stockpilot_users', SKEY = 'stockpilot_session', FKEY = 'stockpilot_fails';
  const ROLES = { admin: ['read', 'write', 'delete', 'validate'], magasinier: ['read', 'write'] };
  async function pbkdf2(pass, saltB64, it = 120000) {
    const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: new Uint8Array(b64d(saltB64)), iterations: it, hash: 'SHA-256' },
      key, 256);
    return b64e(bits);
  }
  const randSalt = () => { const b = crypto.getRandomValues(new Uint8Array(16)); return b64e(b.buffer); };
  async function ensureUsers() {
    if (localStorage.getItem(UKEY)) return;
    const mk = async (login, pass, role) => {
      const salt = randSalt();
      return { login, role, salt, it: 120000, hash: await pbkdf2(pass, salt, 120000) };
    };
    const users = [
      await mk('admin', 'StockPilot!2026', 'admin'),
      await mk('magasinier', 'Magasinier!2026', 'magasinier')
    ];
    localStorage.setItem(UKEY, JSON.stringify(users));
  }
  const fails = () => JSON.parse(localStorage.getItem(FKEY) || '{"n":0,"until":0}');
  const session = () => { try { return JSON.parse(sessionStorage.getItem(SKEY) || 'null'); } catch { return null; } };
  const validSession = () => { const s = session(); return s && s.exp > Date.now() ? s : null; };
  const can = perm => { const s = validSession(); return !!(s && (ROLES[s.role] || []).includes(perm)); };

  async function login(login, pass) {
    const f = fails();
    if (Date.now() < f.until) throw new Error('Compte verrouillé 60s après 5 échecs.');
    const users = JSON.parse(localStorage.getItem(UKEY) || '[]');
    const u = users.find(x => x.login === cleanStr(login, 32));
    const ok = u && (await pbkdf2(pass, u.salt, u.it)) === u.hash;
    if (!ok) {
      const n = f.n + 1;
      localStorage.setItem(FKEY, JSON.stringify(n >= 5 ? { n: 0, until: Date.now() + 60000 } : { n, until: 0 }));
      throw new Error('Identifiants invalides.');
    }
    localStorage.setItem(FKEY, JSON.stringify({ n: 0, until: 0 }));
    sessionStorage.setItem(SKEY, JSON.stringify({ login: u.login, role: u.role, exp: Date.now() + 15 * 60 * 1000 }));
    audit('login', u.login);
  }
  function logout() { audit('logout', (validSession() || {}).login); sessionStorage.removeItem(SKEY); location.reload(); }
  function audit(action, detail = '') {
    try {
      const raw = localStorage.getItem('stockpilot_v1');
      if (!raw) return;
      const db = JSON.parse(raw);
      db.audit = db.audit || [];
      db.audit.push({ t: new Date().toISOString(), user: (validSession() || {}).login || '?', action: cleanStr(action, 40), detail: cleanStr(detail, 120) });
      if (db.audit.length > 500) db.audit = db.audit.slice(-500);
      localStorage.setItem('stockpilot_v1', JSON.stringify(db));
    } catch { /* stockage indisponible */ }
  }
  // Prolonge la session à chaque interaction, expire après 15 min d'inactivité.
  ['click', 'keydown'].forEach(ev => document.addEventListener(ev, () => {
    const s = session();
    if (s) sessionStorage.setItem(SKEY, JSON.stringify({ ...s, exp: Date.now() + 15 * 60 * 1000 }));
  }, { passive: true }));

  window.Sec = { esc, cleanStr, toInt, toFloat, ensureUsers, login, logout, session: validSession, can, audit };
})();
