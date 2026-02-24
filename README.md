# 🕵️ Under100Cover

> Le party game d'infiltration ultime ! Qui est l'undercover parmi vous ?

## 🚀 Stack technique

- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS** (thème cartoon custom)
- **Supabase** (Auth + Database + Realtime)
- **Framer Motion** (animations)

## ⚡ Installation rapide

### 1. Clone et install
```bash
git clone <repo>
cd under100cover
npm install
```

### 2. Supabase setup
1. Crée un projet sur [supabase.com](https://supabase.com)
2. Va dans **SQL Editor** et exécute le fichier `supabase/schema.sql`
3. Dans **Database > Replication**, active le Realtime pour les tables `games` et `game_players`
4. Copie ton **Project URL** et ta **anon key**

### 3. Variables d'environnement
```bash
cp .env.local.example .env.local
# Remplis avec tes vraies clés Supabase
```

### 4. Lance le dev
```bash
npm run dev
```

## 🎮 Pages disponibles

| Route | Description |
|-------|-------------|
| `/` | Page d'accueil avec hero |
| `/auth` | Connexion / Inscription |
| `/create` | Créer une partie avec paramètres |
| `/join` | Rejoindre avec code 6 chiffres |
| `/lobby/[id]` | Salle d'attente avant la partie |
| `/game/[id]` | Gameplay en temps réel |

## 🎭 Logique de jeu

### Rôles
- **😇 Citoyen** : connaît le vrai mot, doit éliminer les infiltrés
- **🦹 Undercover** : a un mot similaire, doit se fondre
- **👻 Mister White** : n'a aucun mot, doit deviner en écoutant

### Ordre des tours
- Mister White ne commence **jamais** (poids le plus élevé)
- Les undercovers ont moins de chances de commencer que les civils
- L'ordre est aléatoire mais pondéré

### Calcul automatique des rôles max
| Joueurs | Max Undercovers |
|---------|----------------|
| 3 | 1 |
| 4-6 | 2 |
| 7-9 | 3 |
| 10+ | floor(N/3) |

## 🎨 Design

Thème cartoon avec :
- **Font** : Fredoka One (titres) + Nunito (corps)
- **Animations** : float, wiggle, bounce3d, pop, morphBlob
- **Dark mode** automatique selon l'OS + bouton toggle
- **Box shadows** style bande dessinée
- **Realtime** via Supabase subscriptions

## 🏗️ Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout + providers
│   ├── page.tsx            # Homepage
│   ├── auth/page.tsx       # Auth
│   ├── create/page.tsx     # Créer une partie
│   ├── join/page.tsx       # Rejoindre
│   ├── lobby/[id]/page.tsx # Salle d'attente
│   └── game/[id]/page.tsx  # Gameplay
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   └── providers/
│       ├── ThemeProvider.tsx
│       └── ToastProvider.tsx
└── lib/
    ├── supabase/
    │   ├── client.ts
    │   └── server.ts
    ├── types/database.ts
    └── game/utils.ts
```

## 🔧 Fait par DML 💜
