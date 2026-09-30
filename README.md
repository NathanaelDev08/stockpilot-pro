# StockPilot Pro

Application de bureau de gestion de stock d’ordinateurs, pensée pour un atelier
informatique qui **n’a ni serveur ni réseau** : tout tourne sur le poste, rien ne
sort.

Projet personnel, développé pour répondre à une contrainte réelle — savoir ce
qui est en stock, dans quel site, et qui l’a sorti — sans installer de base de
données ni exposer les données.

## Ce que l’application fait

- **Tableau de bord** : valeur du stock, rotation, age, ruptures, sites et
  emplacements, avec graphique de suivi
- **Produits** : référentiel filtrable par site, avec seuil de rupture
- **Commandes fournisseurs** et **commandes clients** : statuts, suivi, tri
- **Mouvements** : entrées, sorties, transferts, avec traçabilité
- **Recherche et filtres** sur l’ensemble des vues

## Sécurité

La surface d’attaque a été réduite volontairement. Le détail est documenté dans
[`SECURITY.md`](./SECURITY.md).

- **Aucune commande IPC Tauri** : le frontend ne peut pas exécuter de code natif
- **Authentification locale** : PBKDF2, 120 000 itérations, sel aléatoire de 16 octets
- **Verrouillage** après plusieurs échecs, avec compte à rebours
- **Session expirée au bout de 15 minutes**
- **Validation des entrées** sur tous les champs (nettoyage des caractères de
  contrôle, bornes numériques)
- **Journal d’audit** des connexion, déconnexion et actions sensibles
- **Échappement systématique** avant insertion dans le HTML

## Stack

| | |
|---|---|
| Coquille | Tauri 2 |
| Langage | Rust (côté natif), JavaScript (interface) |
| Stockage | `localStorage` — aucun serveur |
| Interface | HTML / CSS / JavaScript natifs, sans framework |
| Icônes | SVG généré en build |

## Lancer le projet

```bash
npm install
npm run tauri dev     # développement
npm run tauri build   # exécutable Windows
```

Prérequis : [Rust](https://rustup.rs), [Node.js](https://nodejs.org) et les
_outils de compilation Tauri pour Windows_.

## État

Application en développement. Les données sont réelles en usage, le code est
publié pour montrer l’approche retenue sur la sécurité d’un poste de bureau.
