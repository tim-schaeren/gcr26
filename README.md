# Grand City Race 2026

A scavenger hunt / city race app you can play with your friends.

## Project structure

```
gcr26/
├── apps/
│   ├── mobile/       React Native (Expo SDK 54) — iOS & Android
│   └── admin/        React + Vite + Tailwind — web admin console
└── packages/
    └── shared/       Shared TypeScript types and constants
```

This is an npm workspaces monorepo. Run `npm install` from the root to install all dependencies.

## Tech stack

| Layer         | Technology                                               |
| ------------- | -------------------------------------------------------- |
| Mobile        | Expo (React Native), React Navigation, Firebase JS SDK   |
| Admin         | React, Vite, Tailwind CSS, React Router, Firebase JS SDK |
| Backend       | Firebase Auth, Firestore                                 |
| Mobile builds | EAS Build (Expo Application Services)                    |
| Admin hosting | Netlify (auto-deploys from `main`)                       |

---

## Prerequisites

- Node.js 18+
- [Expo account](https://expo.dev) + EAS CLI: `npm install -g eas-cli`
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- Xcode (for local iOS builds)
- Apple Developer account

---

## Environment variables

### Mobile (`apps/mobile/.env`)

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

Copy from `.env.example` and fill in values from Firebase Console → Project Settings → Web app config.

For EAS builds, these are also stored as environment variables in the Expo dashboard under the `preview` environment.

### Admin (`apps/admin/.env`)

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Same Firebase project, different prefix (Vite uses `VITE_`, Expo uses `EXPO_PUBLIC_`).
In production, these are set as environment variables in Netlify.

---

## Development

### Mobile

```bash
cd apps/mobile
npx expo start --clear
```

Scan the QR code with Expo Go (must support SDK 54). The Metro bundler is configured to resolve React from the app's own `node_modules` to avoid duplicate React issues in the monorepo.

### Admin

```bash
cd apps/admin
npm run dev
```

Opens at `http://localhost:5173`. Sign in with a Firebase account that has `isAdmin: true` set in Firestore.

#### Creating the first admin user

1. Sign up via the mobile app or Firebase Console → Authentication
2. In Firestore, create a document at `users/{uid}` with:
   - `isAdmin: true`
   - `email: "your@email.com"`
   - `name: "Your Name"`

---

## Builds & deployment

### Admin (Netlify)

Deploys automatically on every push to `main`. Build config is in `netlify.toml`.

To deploy manually:

```bash
git push origin main
```

### Mobile (iOS)

Builds are done locally using EAS for credential management.

```bash
cd apps/mobile

# Build
eas build --platform ios --profile preview --local

# Submit to TestFlight
eas submit --platform ios --latest
```

The `preview` profile builds a standalone app distributed via TestFlight. Build numbers are auto-incremented.

After submitting, go to [App Store Connect → TestFlight](https://appstoreconnect.apple.com) to add testers.

---

## Firestore

### Security rules

Rules live in `firestore.rules`. Deploy with:

```bash
firebase deploy --only firestore:rules
```

### Data model

See `packages/shared/src/types.ts` for the full data model. Collections:

| Collection      | Description                                            |
| --------------- | ------------------------------------------------------ |
| `users`         | Firebase Auth users with game profile and push token   |
| `teams`         | Race teams — score, current quest, inventory           |
| `quests`        | The race challenges in order                           |
| `shopItems`     | Items teams can buy with in-game currency              |
| `messages`      | In-app chat (global and per-team)                      |
| `broadcasts`    | Admin push notifications to all teams                  |
| `settings`      | Global game settings (sign-up open, game active, etc.) |
| `registrations` | Pre-game sign-up submissions                           |
