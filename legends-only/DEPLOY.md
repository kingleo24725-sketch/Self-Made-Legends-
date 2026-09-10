# Private test deploy on Railway

This is a private test, not a launch. The URL is random, nothing is announced, and you can delete the project any time.

## 1. Create the project (about 5 minutes)

1. Go to https://railway.com and sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → pick `kingleo24725-sketch/Self-Made-Legends-`.
3. Railway asks which branch: choose **`claude/upbeat-volta-i5c8e1`**.
4. Open the new service → **Settings** → **Root Directory** → set it to `legends-only`. Save. (The app lives in that folder.)
5. Still in Settings → **Networking** → **Generate Domain**. Copy the URL it gives you (something like `legends-only-production-xxxx.up.railway.app`).

## 2. Give it a disk so nothing is lost on restart

1. In the project canvas, right-click (or the **+ New** button) → **Volume** → attach it to the service.
2. Mount path: `/data`.

## 3. Variables

Service → **Variables** → **Raw Editor**, paste, then edit `APP_URL` to the domain from step 1.5 and pick your own `ADMIN_KEY`:

```
APP_URL=https://YOUR-DOMAIN.up.railway.app
DB_PATH=/data/legends-only.db
DATA_DIR=/data
ADMIN_KEY=pick-a-long-secret
DEFAULT_TIER=hof
ALLOW_FREE_CLUB=1
NODE_ENV=production
```

`DEFAULT_TIER=hof` and `ALLOW_FREE_CLUB=1` unlock everything for testing. Set them to `free` and `0` before launch.

Optional, when you have them: `ANTHROPIC_API_KEY` (turns the live crew on; without it the app runs in playbook mode), `STRIPE_*`, `VAPID_*` for push (`npx web-push generate-vapid-keys`), `TWILIO_*` for phone codes.

## 4. Deploy

Railway builds on its own after the variables save (or click **Deploy**). Two or three minutes. The log ends with `Legends Only listening`.

## 5. On your iPhone

1. Open the URL in **Safari** (not Chrome; only Safari can install).
2. Tap **Share** → **Add to Home Screen** → **Add**. The gold seal appears as the app icon.
3. Open it from the home screen. Create your account through the grind door. Camera, video calls, and lives all work over the Railway HTTPS URL.
4. Owner console: `https://YOUR-DOMAIN/admin.html` with your `ADMIN_KEY`.

## Updating

Every push to `claude/upbeat-volta-i5c8e1` redeploys automatically. Your data stays on the volume.

## Deleting

Project → Settings → Delete Project. Gone in one click, nothing lingers.
