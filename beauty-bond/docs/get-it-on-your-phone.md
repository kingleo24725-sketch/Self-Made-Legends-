# Getting the app onto your phone

> **DAD + DAUGHTER BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT**
> © 2026 **Self-Made Legends LLC (SML)**. All rights reserved.
> Owner: **Self-Made Legends LLC (SML)** · Proprietary and confidential.

Every other document here assumes a computer. This one does not. It is the
whole path from "the code exists" to "the app is on an Android phone", and it
needs a phone browser and nothing else.

---

## iPhone — the free version, right now

**Open this in Safari:**

```
https://web-production-75d20c.up.railway.app
```

Then tap the **Share** button (the square with the arrow), scroll down, and tap
**Add to Home Screen**. You get an icon that opens full-screen with no address
bar. For everyday use it is the app.

No Apple account, no fee, no store. It updates itself — when the app changes,
the page changes; there is nothing to reinstall.

### What is different in the browser version

| | |
|---|---|
| Vault, Letters Forward, Bond Meter, lessons, guardian console | All work |
| **The Healing Journal** | **Absent, deliberately** |

The journal's promise is a key generated on your phone, kept in the phone's
secure keychain, that we cannot read even if asked. A browser has no keychain —
the key would sit in ordinary browser storage that any script on the page can
read. Rather than keep the feature and quietly break the promise, the web
version says the journal is waiting in the phone app. `stripe-flow.md` §3.9 is
the same rule applied to billing.

Your sign-in token *does* live in browser storage, which is how every website
works and is weaker than the keychain. Worth knowing; not worth hiding.

### iPhone — the real app ($99/year)

Apple requires a paid Developer Program membership before any app runs on an
iPhone, and every free workaround needs a Mac. There is no way around it.

All of it is still phone-only:

1. **Apple Developer** app from the App Store → enroll. $99/yr, usually
   approved in 24–48 hours.
2. **appleid.apple.com** → Sign-In and Security → App-Specific Passwords →
   generate one and copy it.
3. Add two repository secrets, the same place `EXPO_TOKEN` went:
   `EXPO_APPLE_ID` (your Apple email) and
   `EXPO_APPLE_APP_SPECIFIC_PASSWORD` (what you just copied).

Then the build runs on EAS's macOS machines and lands in **TestFlight**, which
installs like a normal App Store app. That is also the path to the App Store
itself later.

Note for whoever maintains this: iOS cannot use `--local` the way the Android
build does — that plugin is Linux-only — so an iOS failure means reading EAS's
logs on expo.dev rather than the Actions log.

---

## Android — how it works

Expo builds Android apps **on their servers**. GitHub tells them to start a
build whenever the app code changes. Expo emails a link when it's done. You tap
the link and it installs. Nobody types a command anywhere in that sentence.

```
code pushed  ->  GitHub Actions  ->  Expo's build servers  ->  email  ->  tap  ->  installed
```

The workflow is `.github/workflows/beauty-bond-android.yml`. It triggers on
**push**, deliberately: finding a "Run workflow" button in GitHub's mobile web
UI is exactly the kind of step this is meant to remove.

---

## The one-time setup — three things, about ten minutes

Use **Chrome on the phone, not the GitHub app.** The GitHub app has no Settings
screen, which is where the third step lives.

**1. A free Expo account** — https://expo.dev → Sign Up.

**2. An access token**

Go to https://expo.dev/settings/access-tokens → **Create token** → name it
`github` → **Create** → **Copy it.** It is shown once.

**3. Hand it to GitHub**

Go to `Settings → Secrets and variables → Actions → New repository secret` on
the repo, or straight to
`https://github.com/<owner>/<repo>/settings/secrets/actions/new`.

| Field | Value |
|---|---|
| Name | `EXPO_TOKEN` |
| Secret | the token you copied |

Then **Add secret**. That is the setup finished, permanently.

> **The token is a password.** It goes in the GitHub secret box and your
> password manager. Never in a chat, a commit, or a pull request — same rule as
> the Stripe key (`NOTICE.md` §6). If it is ever pasted somewhere it shouldn't
> be, revoke it on the same Expo page and make a new one; nothing else breaks.

Until that secret exists the workflow **skips and stays green**, with those
instructions printed as a notice. That is deliberate: a red mark meaning "setup
isn't finished" looks exactly like a red mark meaning "your app is broken", and
only one of those is true.

Once the token is in place the workflow can be run without a new commit —
GitHub **Actions → Beauty Bond Android build → Run workflow**, or whoever is
working on the code can trigger it for you.

---

## Every build after that

1. The app code changes and is pushed.
2. GitHub → **Actions** tab → *Beauty Bond Android build* starts on its own.
3. Roughly 15–20 minutes.
4. **Expo emails you** a link. It is also at
   expo.dev → Projects → `dad-daughter-beauty-bond` → **Builds**.
5. Tap the build → **Install**.
6. Android asks once whether to allow installs from Chrome. Say yes.
7. It's on the phone.

Updates install straight over the top — Expo keeps the signing key, so the new
build is recognised as the same app.

---

## When you open it

The first screen checks whether it can reach the API and says so
(`app/components/HealthBanner.js`). If the banner says **"Can't reach Beauty
Bond's server"**, the app is fine and the server is not — check the Railway
deploy (`deploy-railway.md` §4), not the build.

No banner at all means it connected. Silence is the good outcome.

---

## What this does not cover

| | |
|---|---|
| **The Play Store** | A separate step: $25 once, plus a review queue. This installs the app directly, which is all v1 needs. |
| **iPhone, natively** | Covered above: the browser version is free and works today; the native app needs the $99/year Apple account. |
| **Try-On and Glam Rooms** | Switched off in v1 and their SDKs are not in the build. `stripe-flow.md` §3.9 and `video-rooms.md` §5.11 hold the restore steps. |

---

## If a build fails

The GitHub Actions log holds the outcome — that is why the workflow uses
`--wait` rather than `--no-wait`. Read it at **Actions → the failed run**.

| What it says | What it means |
|---|---|
| `Waiting for EXPO_TOKEN` (green, build skipped) | The setup above, step 3, is not done yet. Nothing is wrong with the code. |
| Fails at *Generate the native project* | A config problem in `app.json` — caught in under a minute, before any cloud build time is spent. |
| Fails at *Build the APK* | A real native build failure. The full Gradle log is on expo.dev, linked from the Actions log. |
