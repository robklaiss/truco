# Truco Paraguayo Online (MVP)

## Repo structure

- `client/`: Firebase Hosting frontend (HTML/CSS/JS vanilla)
- `server/`: Cloud Run PHP API (authoritative) (pending in Step 2)
- `scripts/`: build/helper scripts (e.g. SVG deck split)

## Step 1 (implemented): Client bootstrap

### What works

- Google login (Firebase Auth)
- Profile screen to set `nickname` in Firestore (`users/{uid}`)
- Home / Game / Leaderboard screens scaffolded

### Local smoke test (Step 1)

1) Create a Firebase project and enable:

- Authentication: Google provider
- Firestore (Native mode)

2) Confirm `client/public/firebase-config.js` matches your Firebase Web App config.

- The frontend reads config from `window.FIREBASE_CONFIG`.
- You can use `client/public/firebase-config.example.js` as reference.

3) Serve `client/public` locally (any static server). Example:

```bash
php -S 127.0.0.1:5173 -t /Users/robinklaiss/Dev/truco/client/public
```

4) Open:

- `http://127.0.0.1:5173/login.html`

### Firebase Hosting deploy notes

- The Hosting config lives in `client/firebase.json`.
- Predeploy runs `php client/scripts/sync_public.php` to copy `client/src` into `client/public/src`.

## Step 2 (implemented): PHP API bootstrap (Cloud Run)

### What works

- REST router: `server/public/index.php`
- `GET /api/health`
- `GET /api/whoami` (requires Firebase ID token)

### Required env vars

- `FIREBASE_PROJECT_ID`: your Firebase project id (used to validate `aud`/`iss`)
- `ALLOWED_ORIGIN` (optional): for CORS

### Local smoke test (server)

1) Install deps:

```bash
composer install
```

2) Run locally:

```bash
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID php -S 127.0.0.1:8081 -t server/public
```

3) Check:

- `http://127.0.0.1:8081/api/health`

## Next

- Step 3: SVG deck split script -> `client/public/cards/*` + `client/public/cards/cards.json`.
