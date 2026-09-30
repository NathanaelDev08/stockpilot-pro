# StockPilot Pro — Politique sécurité

## Surface d'attaque
- Aucune commande IPC Tauri (`main.rs` minimal, aucun plugin fs/shell/http). Le frontend ne peut pas exécuter de code natif.
- Aucune dépendance JS runtime (vanilla). Seule devDependency : `@tauri-apps/cli` pinné en `2.12.0`.

## Mesures appliquées
1. **CSP stricte** (`tauri.conf.json` + `<meta>` dans `index.html`) : `default-src 'self'`, pas de CDN, `object-src 'none'`, `frame-ancestors 'none'`. DevTools désactivés en release.
2. **Moindre privilège** : capability `core:default` seule, fenêtre `main` unique, DevTools désactivés en release (`devtools: false`), bundle limité à `msi`+`nsis`.
3. **XSS** : `Sec.esc()` sur chaque interpolation (`tblProducts`, scan, notifs, modales), validation `cleanStr/toInt/toFloat` avec bornes, suppression du barcode-SVG dynamique injecté.
4. **Auth locale** (`security.js`) : PBKDF2-SHA256 120 000 itérations + sel 128 bits, 2 rôles (admin/magasinier), verrouillage 60s après 5 échecs, session 15 min glissante en `sessionStorage`, suppression réservée admin.
5. **Intégrité du store** : revalidation du `localStorage` au chargement (filtre + plafond 5000), `try/catch` quota, journal d'audit horodaté plafonné à 500 entrées (traçabilité).
6. **Binaire** : profil release `strip + lto + codegen-units=1 + opt-z`, pas de `unsafe` custom, WebView2 système (mises à jour Windows).
7. **Supply chain** : versions pinnées, `npm audit`, `cargo` locké. Relancer `npm.cmd audit` et `cargo audit` avant chaque release.

## Comptes démo (à changer en production)
- admin / StockPilot!2026 (delete + validate)
- magasinier / Magasinier!2026 (write, sans delete)

## Reste à faire côté ops
- Changer les mots de passe, activer BitLocker, signer le MSI/NSIS (certificat), distribuer via canal privé.
- Sauvegarde chiffrée hors poste. Ne jamais activer `shell`/`fs` Tauri sans capability dédiée.
