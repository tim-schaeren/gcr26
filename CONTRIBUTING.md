# Contributing to GCR26

Thanks for helping out, I appreciate it! This is a monorepo with two apps: a React Native mobile app and a React/Vite admin console, backed by Firebase.

## Setup

Fork the repo on GitHub, then:

```bash
git clone https://github.com/YOUR_USERNAME/gcr26.git
cd gcr26
npm install
cp apps/admin/.env.example apps/admin/.env
cp apps/mobile/.env.example apps/mobile/.env
```

The `.env.example` files use placeholder values — they work as-is for local development since everything runs against the emulator. The only exception is `EXPO_PUBLIC_EMULATOR_HOST` in `apps/mobile/.env`, which needs to be set to your machine's LAN IP if testing on a physical device (see [Physical devices](#physical-devices)).

`APPLE_ID` and `ASC_APP_ID` can be left blank, they're only needed for `npm run ship`.

## Running locally

Start the Firebase emulator first (from the repo root):

```bash
firebase emulators:start
```

No Firebase login required. The emulator UI is at http://localhost:4000. You can browse and edit data there.

**Admin console** (http://localhost:5173):

```bash
cd apps/admin
npm run dev
```

**Mobile** (download Expo Go, then scan the QR in the terminal):

```bash
cd apps/mobile
npx expo start --clear
```

Both apps auto-connect to the emulator in dev mode. Data is local and ephemeral, nothing touches the real project.

## Database

### Getting admin access

The admin console requires your Firestore user document to have `isAdmin: true`. Sign up via the mobile app first, then open the emulator UI at http://localhost:4000, find your document in the `users` collection, and set `isAdmin: true`.

### Seeding test players

With the emulator running:

```bash
cd apps/admin
node --env-file=.env ../../local/seed-players.mjs
```

Test account credentials are in `local/test-players.md`.

### Physical devices

If you're running Expo Go on a physical device (not a simulator), the device can't reach `localhost` on your machine. Set `EXPO_PUBLIC_EMULATOR_HOST` in `apps/mobile/.env` to your machine's LAN IP:

```
EXPO_PUBLIC_EMULATOR_HOST=192.168.1.x
```

### Firestore rules

Rules live in `firestore.rules`. If your PR changes them, flag it clearly in the PR description. Only the project owner can deploy them to production. Deploying requires Editor/Owner access to the Firebase project, separate from the client config.

## Submitting a PR

- Create a branch in your fork, named descriptively (`fix/quest-ordering`, `feat/team-chat`)
- Keep PRs focused. One thing at a time
- The CI workflow runs `npm ci` and builds the admin app to catch obvious breakage
- If you're changing Firestore rules or the shared data model (`packages/shared/src/types.ts`), call that out clearly in the PR description

## Building for mobile

Regular contributors don't need to build the app. Just use Expo Go for development. Submitting to TestFlight requires Apple credentials (`APPLE_ID`, `ASC_APP_ID` in `apps/mobile/.env`) and is handled by the project owner:

```bash
cd apps/mobile
npm run ship
```

## Contributing to the Wiki

GitHub Wikis do not natively support pull requests. If you would like to contribute to the project's wiki, you can follow these steps to propose changes via your own fork.

### Setup

You will need to do the following one time only:

1. Fork the `tim-schaeren/gcr26` repository under your namespace.
2. Navigate to `https://github.com/YOUR_USERNAME/gcr26/wiki` in your browser.
3. Hit **Create the first page**. You will get an error (that's ok!).
4. Navigate to `https://github.com/YOUR_USERNAME/gcr26/wiki` again and you will see the wiki updated.
5. Clone your wiki repository locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/gcr26.wiki.git
   cd gcr26.wiki
   ```
6. Add the upstream wiki remote:
   ```bash
   git remote add upstream https://github.com/tim-schaeren/gcr26.wiki.git
   ```
7. Fetch the latest master:
   ```bash
   git fetch upstream master
   ```

### Keeping your fork in sync

```bash
git checkout master
git fetch upstream master
git merge upstream/master
git push origin master
```

### Submitting changes to your fork

```bash
git checkout master
git add .
git commit -m "single line sub 50 char description"
git push origin master
```

### Submitting changes to the main repository

When you're ready to submit, open an issue at https://github.com/tim-schaeren/gcr26/issues and provide the following:

- A link to your fork's wiki repository.
- A description of the changes you've made.

## Core Contributors

### Reviewing Changes

As a core contributor you can review the changes done using:

```bash
git checkout -b contributor-master
git pull https://github.com/CONTRIBUTOR_USERNAME/gcr26.wiki.git master
```

### Merging Changes

As a core contributor you can merge the changes using:

```bash
git checkout master
git merge --no-ff contributor-master
git push origin master
```

