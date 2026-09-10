# Native wrappers (iOS and Android)

The app is a PWA and installs from the browser today. These wrappers put the
same app in the App Store and Google Play with a native shell around it,
using [Capacitor](https://capacitorjs.com). The wrapper loads the deployed
web app from `server.url`, so every release of the server is a release of the
app with no store review.

Binaries need Xcode (Mac) and Android Studio, so they are built on a laptop,
not on the server. Nothing here is published until the owner says go.

## One-time setup

```bash
npm run native:setup          # installs @capacitor/core, cli, ios, android
# edit capacitor.config.json: server.url = https://your-deployed-domain
npm run native:add:ios        # creates ios/  (needs a Mac with Xcode)
npm run native:add:android    # creates android/ (needs Android Studio)
```

## Each release

```bash
npm run native:sync           # copies config into the native projects
npx cap open ios              # archive and upload from Xcode
npx cap open android          # build a signed bundle from Android Studio
```

## Store listing

- Name outside the app: **Legends Only**. Inside, everything is Self-Made Legends.
- Icon: `public/icon.svg` (export 1024x1024 PNG). Splash: gold seal on `#0b0d12`.
- Category: Productivity (secondary: Business).
- Push: web push works inside the wrapper on Android. On iOS, add `@capacitor/push-notifications` and an APNs key, then post the device token to `/api/push/subscribe` with `{ subscription: { endpoint: 'apns:<token>' } }` once an APNs sender is added to `src/push.js`. Until then iOS users get the in-app inbox and Final Call.
- Camera and microphone are used for receipts, calls, lives, and crew calls. The wrapper adds the usage strings:
  - iOS `NSCameraUsageDescription`: "Photos of receipts and video calls with friends."
  - iOS `NSMicrophoneUsageDescription`: "Video calls and going live."
- Payments: memberships and tips run through Stripe Checkout in the browser, not in-app purchase. Apple's rules allow this for services consumed outside the app (real-world work) but the reviewer may push back; the safe path is to hide the Memberships card inside the iOS wrapper (`window.Capacitor?.getPlatform() === 'ios'`) and let people buy on the web.
- Device id: the app stores a random id in local storage for one-account-per-phone. Inside a wrapper, storage persists with the app, which is what we want.
