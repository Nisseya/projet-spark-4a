# ASL Pipeline — Frontend

Next.js 15 + App Router + Tailwind + shadcn-style components, dark only, indigo accent.
Auth : better-auth + Google Sign-in (Drizzle + Postgres).
Data : consomme l'API FastAPI (`../backend`) — stats et vidéos servies via URLs présignées RustFS.

## Structure

```
app/
├── page.tsx                 Dashboard global
├── login/page.tsx           Sign-in Google
├── videos/
│   ├── page.tsx             Mes vidéos + upload
│   └── [id]/page.tsx        Viewer annoté
├── users/[id]/page.tsx      Stats d'un utilisateur (self only)
├── tops/page.tsx            Classements
├── admin/page.tsx           Lancer Main/Train/Stats (SSE)
└── api/auth/[...all]/       better-auth handler
```

## Setup

### 1. Installer

```bash
pnpm install       # ou npm install / yarn
```

### 2. Env

Copie `.env.local.example` vers `.env.local` et remplis :

```bash
cp .env.local.example .env.local
openssl rand -base64 32   # pour BETTER_AUTH_SECRET
```

### 3. Google OAuth

Crée un client OAuth sur https://console.cloud.google.com/apis/credentials

- Authorized origin : `http://localhost:3000`
- Authorized redirect URI : `http://localhost:3000/api/auth/callback/google`

Colle `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` dans `.env.local`.

### 4. Base de données

Le schéma `drizzle/schema.ts` inclut les tables de better-auth (`user`, `session`, `account`, `verification`).
Regénère si tu actives d'autres plugins :

```bash
pnpm auth:generate
pnpm db:push
```

Ensuite, migration de la contrainte `videos.created_by` (elle doit pointer vers `user.id`
de better-auth, pas l'ancienne table `users`) :

```sql
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_created_by_fkey;
ALTER TABLE videos
  ADD CONSTRAINT videos_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES "user"(id);
DROP TABLE IF EXISTS users;

-- Ajoute UPLOAD_STARTED dans le CHECK si absent
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_status_check;
ALTER TABLE videos ADD CONSTRAINT videos_status_check
  CHECK (status IN ('UPLOAD_STARTED','UPLOAD_COMPLETE','EXTRACTING','PROCESSING','DONE','FAILED'));
```

### 5. RustFS / MinIO CORS

Le front upload et fetch les vidéos + JSONs **directement** depuis RustFS via URLs présignées.
Il faut activer CORS sur le bucket :

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Avec `mc` : `mc admin config set myrustfs cors ...` ou via l'interface RustFS.

### 6. Lancer

```bash
pnpm dev
```

Assure-toi que FastAPI tourne sur `http://localhost:8000` en parallèle.

## Flow utilisateur

1. `/login` → sign-in Google
2. `/videos` → upload une vidéo (PUT direct vers RustFS)
3. `/admin` → clic **Run Main** pour lancer le pipeline Spark (console SSE live)
4. À la fin, clic **Run Stats** pour générer les JSONs
5. `/` → dashboard, `/videos/[id]` → viewer annoté, `/tops` → classements

## Points d'attention

- **Upload long** : XHR avec progress bar ; la connexion doit tenir le temps de l'upload.
- **SSE long-running** : le job sbt continue même si le client se déconnecte.
- **Presigned URLs** : TTL 15 min par défaut (`PRESIGN_TTL` côté back).
- **Auth** : les routes front sont protégées côté client (redirect si `!session`). Le back FastAPI
  fait confiance au front — si tu exposes ça sur le net, ajoute une vérif de token côté FastAPI.
