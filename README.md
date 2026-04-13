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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, the local Firebase emulator workflow, and how to submit a PR.

---

## Builds & deployment

### Admin (Netlify)

Deploys automatically on every push to `main`. Build config is in `netlify.toml`.

### Mobile (iOS)

Builds are done locally using EAS for credential management. A single command builds and submits to TestFlight:

```bash
cd apps/mobile
npm run ship
```

This sources `.env` so Firebase config is baked in, builds locally with EAS, and submits the resulting IPA to TestFlight. Build numbers are auto-incremented.

After submitting, Apple takes ~10 minutes to process. Then go to [App Store Connect → TestFlight](https://appstoreconnect.apple.com) to add testers.

---

## Firestore

### Security rules

Rules live in `firestore.rules`. Deploy with:

```bash
firebase deploy --only firestore:rules
```

### Admin user

To grant admin access to a user in production, set `isAdmin: true` on their document in the `users` collection via the [Firebase Console](https://console.firebase.google.com/project/gcr26-d76cc/firestore/data/users).

### Data model

See `packages/shared/src/types.ts` for the full data model. Collections:

| Collection                    | Description                                                   |
| ----------------------------- | ------------------------------------------------------------- |
| `users`                       | Firebase Auth users with team assignment and push token       |
| `games`                       | Race events — multiple can be active simultaneously           |
| `games/{id}/quests`           | Quests scoped to a game; order stored as `questOrder` on game |
| `teams`                       | Race teams — belong to a game, have many members              |
| `shopItems`                   | Items teams can buy with in-game currency                     |
| `messages`                    | In-app chat                                                   |
| `broadcasts`                  | Admin push notifications to all teams                         |
| `settings`                    | Global config (sign-up open, hotline number)                  |
| `registrations`               | Pre-game sign-up submissions (public write)                   |

User → Team → Game is the chain: a user belongs to one team, a team belongs to one game.
