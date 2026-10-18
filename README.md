# Grand City Race 2026

A scavenger hunt / city race app you can play with your friends.

Licensed under [GPL v3](LICENSE) — free to use, modify, and distribute, but derivatives must remain open source under the same license.

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

This sources `.env` so Firebase config is baked in, builds locally with EAS, and uploads the resulting IPA straight to App Store Connect with Xcode's `altool`. Build numbers are auto-incremented. Uploading directly avoids the EAS Submit queue, which can be slow on the free tier.

Upload needs one of these in `apps/mobile/.env`:

- **App Store Connect API key** (preferred — no 2FA, doesn't expire): generate a key with the App Manager role under App Store Connect → Users and Access → Integrations → Keys, save the downloaded `.p8` as `~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8`, then set `ASC_KEY_ID` and `ASC_ISSUER_ID`.
- **App-specific password**: create one at [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security, then set `APPLE_APP_SPECIFIC_PASSWORD` (with `APPLE_ID`).

After uploading, Apple takes ~10 minutes to process. Then go to [App Store Connect → TestFlight](https://appstoreconnect.apple.com) to add testers.

### Mobile (Android)

```bash
cd apps/mobile
npm run ship:android
```

Builds an app bundle locally with EAS and uploads it straight to the Play **internal testing** track with `fastlane supply`, skipping the EAS Submit queue. Version codes are auto-incremented.

Needs `apps/mobile/play-service-account.json`: a Google service account key whose account is invited in Play Console → Users and permissions with release and testing-track access. The same key can serve both Play submissions and FCM push, so one key from Firebase Console → Project settings → Service accounts is enough. It is gitignored — never commit it.

Push notifications additionally need that key uploaded to EAS once:

```bash
eas credentials   # Android → preview → Google Service Account → FCM V1
```

The signing keystore is managed by EAS. It is the upload key for the Play listing, so back it up (`eas credentials` can export it) and never replace it.

---

## Firestore

### Security rules

Rules live in `firestore.rules`. Deploy with:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Rules carry most of the game's integrity — who may run a game, what a player may
write about their own team, and which teams can see each other's business — so
they have a test suite. Run it against a throwaway project on its own ports,
leaving your dev data alone:

```bash
firebase emulators:start --project rules-test --config firebase.rules-test.json
node local/rules-test.mjs
```

It covers a platform admin, a host, a player, a rival team and an outsider,
including a player whose profile predates some fields. Add a case whenever you
touch the rules.

### Roles

Two separate things:

- **Platform admin** — `isAdmin: true` on a user document, set via the
  [Firebase Console](https://console.firebase.google.com/project/gcr26-d76cc/firestore/data/users).
  Runs every game and is the only role that can read the whole player list.
- **Host** — listed in a game's `hostIds`. Runs that game and sees nothing of
  any other. Whoever creates a game becomes its host, so anyone who signs up on
  the web console can host their own race.

### How people get into a game

A game has a `joinCode`, shown on its Game page in the console. Players enter it
in the app, which writes a membership document at `games/{id}/players/{uid}` —
that record is what lets them pick or start a team, and what lets a host see
their own players without read access to every user on the platform. Players can
leave a game, and delete their account, from the app.

### Data model

See `packages/shared/src/types.ts` for the full data model. Collections:

| Collection                    | Description                                                   |
| ----------------------------- | ------------------------------------------------------------- |
| Collection                    | Description                                                        |
| ----------------------------- | ------------------------------------------------------------------ |
| `users`                       | Accounts: name, email, `gameId`, `teamId`, push token              |
| `games`                       | Race events — `hostIds`, `joinCode`, coin and shop settings        |
| `games/{id}/quests`           | Quests scoped to a game; order stored as `questOrder` on the game  |
| `games/{id}/players`          | Who joined this game, so hosts can see their own players           |
| `games/{id}/activity`         | The bulletin board; entries are `public` or `team`-private         |
| `games/{id}/messages`         | Chat, one thread per team, between that team and the hosts         |
| `games/{id}/attempts`         | Rejected answers — hosts only, never readable by players           |
| `teams`                       | Teams: members, progress, coins, hints bought, active items        |
| `teams/{id}/coinLedger`       | Why a host changed a team's balance                                |
| `trail`                       | Location history during a game; hosts read, the owner can delete   |
| `settings`                    | Global config (sign-up open)                                       |
| `registrations`               | Pre-game sign-up submissions (public write)                        |

User → Team → Game is the chain: a user belongs to one team, a team belongs to
one game. A user may also have a `gameId` without a `teamId` — joined, but still
picking a team.

### Public pages

The console also serves the pages the app stores require, with no sign-in:
`/privacy`, `/terms` and `/guidelines`. The app links to them from sign-up and
from a player's profile.
