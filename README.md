# Grand City Race 2026

A scavenger hunt / city race app you can play with your friends.

Licensed under [GPL v3](LICENSE) — free to use, modify, and distribute, but derivatives must remain open source under the same license.

## Project structure

```
gcr26/
├── apps/
│   ├── mobile/       React Native (Expo SDK 57) — iOS & Android
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

### Server functions

`netlify/functions/` holds what a host's console or a player's app may not do
by itself, deployed with the site:

| Path               | Does                                                                 |
| ------------------ | -------------------------------------------------------------------- |
| `/api/use-item`    | Curse, Robbery and Donate: items one team uses on another             |
| `/api/hosts`       | A host adds or removes co-hosts by email                             |
| `/api/send-push`   | A host's push to the game's players                                  |

The Netlify build bundles them with `netlify/build-functions.mjs` (they import
the shared TypeScript package) and deploys the result from `netlify/.dist`.

They run with Firebase admin access, which bypasses the security rules, so
each one checks the caller's Firebase sign-in itself. They need the
service account key in the Netlify site's environment as
`FIREBASE_SERVICE_ACCOUNT` (the whole JSON, scoped to Functions). Without it
they answer with an error and nothing else breaks.

Locally they run against the emulators:

```bash
node local/functions-dev.mjs     # serves them on :8888; the console's dev server forwards /api
node local/functions-test.mjs    # checks them end to end (after seed-players and seed-demo)
```

For the app on a phone, set `EXPO_PUBLIC_API_URL=http://<LAN IP>:8888` in
`apps/mobile/.env`, next to `EXPO_PUBLIC_EMULATOR_HOST`.

### Patched dependencies

`patches/` holds fixes to third-party packages, applied by `patch-package` after
every `npm install`. `expo-location` copies Android sensor readings instead of
keeping a reference to them; on some phones the compass froze without it.

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

### Store listings

Everything the App Store and Play listings need lives in `apps/mobile/store/`:
the listing text and privacy answers (`listing.md`), screenshots for both
stores, the Play feature graphic, and in `source/` what they are rendered
from. Two scripts in `local/` support them:

- `seed-demo.mjs` fills the local emulator with a believable race to take
  screenshots of.
- `setup-review.mjs` creates the app reviewers' accounts and demo race in
  production, and resets it between review rounds. Its passwords live in
  `apps/mobile/store/review-credentials.local.md`, which is never committed.

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

Every player in a game can read its player list (the team picker names who is
in each team), so it holds names only. Each player's last position and push
token go to `games/{id}/private/{uid}`, which only that player and the game's
hosts can read; the console's live map, leaderboard and push read them from
there. Profiles in `users` also hold email addresses, which hosts don't get to
see; only platform admins read them, and the console merges them in so players
on older builds still show up for an admin.

### Data model

See `packages/shared/src/types.ts` for the full data model. Collections:

| Collection                    | Description                                                        |
| ----------------------------- | ------------------------------------------------------------------ |
| `users`                       | Accounts: name, email, `gameId`, `teamId`, push token              |
| `games`                       | Race events — `hostIds`, `joinCode`, `themeId`, coin and shop settings |
| `games/{id}/quests`           | Quests scoped to a game; order stored as `questOrder` on the game  |
| `games/{id}/players`          | Who joined, by name — every player in the game can read it         |
| `games/{id}/private`          | Each player's last position and push token — only they and the hosts read it |
| `games/{id}/avatars`          | Avatar (temporary, race of 24 Oct 2026): a picture per team per quest |
| `games/{id}/activity`         | The bulletin board; entries are `public` or `team`-private         |
| `games/{id}/messages`         | Chat, one thread per team, between that team and the hosts         |
| `games/{id}/attempts`         | Rejected answers — hosts only, never readable by players           |
| `teams`                       | Teams: members, progress, coins, hints bought, active items        |
| `teams/{id}/coinLedger`       | Why a host changed a team's balance                                |
| `trail`                       | Location history during a game; hosts read and clear it on reset, the owner can delete |
| `settings`                    | Global config (sign-up open)                                       |
| `registrations`               | Pre-game sign-up submissions (public write)                        |

User → Team → Game is the chain: a user belongs to one team, a team belongs to
one game. A user may also have a `gameId` without a `teamId` — joined, but still
picking a team.

### Copy

Every word the player app shows lives in `packages/shared/src/copy/en.ts`,
grouped by screen: buttons, messages, the activity feed, item names and
descriptions, sign-in errors, and what the server functions say to players.
Change wording there, not in the screens. Sentences with names or numbers are
small functions; keep their `${...}` parts. A second language is a copy of the
file (`de.ts`), which TypeScript checks for completeness. The console's copy
isn't in it yet.

### Themes and icons

A host picks a look per game in the console (`themeId` on the game): **Basic**
(black on white) or **Retro** (Tangerine, Black Cherry and Cool Blue, set in
Righteous). Themes are presets in `packages/shared/src/themes.ts`, each with
every colour role checked for contrast against its own background, which is why
hosts choose a preset rather than free colours. The app applies the theme from
the team picker on; sign-in and joining stay Basic.

Screens build their styles from the theme through
`apps/mobile/src/theme/primitives.ts` (headings, labels, panels, buttons,
inputs) rather than hardcoded colours. Icons are Material Design Icons
everywhere — `@expo/vector-icons` in the app, `@mdi/js` in the console — named
in `packages/shared/src/icons.ts`. The UI uses no emoji.

App icons and splash come from `apps/mobile/app-icons/`; Expo generates every
size from the masters referenced in `app.json`.

### Public pages

The console also serves the pages the app stores require, with no sign-in:
`/privacy`, `/terms` and `/guidelines`. The app links to them from sign-up and
from a player's profile.
