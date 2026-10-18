# Store listing

Everything App Store Connect and Play Console ask for, in the order they ask.
Character limits are noted; every field here fits its limit. Keep the privacy
answers in step with [the privacy policy](https://gcr26-dev.netlify.app/privacy)
when the app's data handling changes.

Review account passwords are in `review-credentials.local.md` (not in git).

## Links

The site is moving to **grand-city-race.com**. When the domain is live:

1. Change `WEB_URL` in `apps/mobile/src/config.ts`.
2. Replace the URLs in this file and in both store consoles.
3. Keep `gcr26-dev.netlify.app` working, so links in builds already installed still open.

Until then, use the URLs below, which work today.

| Field                         | Value                                                      |
| ----------------------------- | ---------------------------------------------------------- |
| Privacy policy                | https://gcr26-dev.netlify.app/privacy                      |
| Support                       | https://gcr26-dev.netlify.app/support                      |
| Account deletion (Play)       | https://gcr26-dev.netlify.app/support#delete-account       |
| Marketing (optional)          | https://gcr26-dev.netlify.app/login                        |
| Contact email                 | paddock-cliques5u@icloud.com                               |

## Text

**App name** (30) — `Grand City Race`

**Subtitle — App Store** (30) — `Scavenger hunts for your city`

**Short description — Play** (80) —
`Race your friends through the city: follow clues, solve quests, top the board.`

**Promotional text — App Store** (170, can change without review) —
`Host your own city race in minutes: write the quests, share a code, and watch the teams race across town. Now with themes, starting with Retro.`

**Keywords — App Store** (100, comma separated, no spaces) —
`scavenger hunt,treasure hunt,city game,team,quest,puzzle,outdoor,rally,friends,party,trail,riddle`

**Description** (4000, both stores) —

```
Grand City Race turns your city into a scavenger hunt you play with your friends.

Teams race from place to place. Each quest unlocks when your team reaches the right spot or has walked far enough, then asks you to crack a riddle, find a detail on a building, or simply take a break. Solve it, earn coins, and move on to the next one before the other teams do.

FOLLOW THE CLUES
Every quest starts with a hint about where to go next. Stuck? Spend coins on a compass that points the way, or reveal a hint for the riddle.

RACE THE OTHER TEAMS
A live board shows who is ahead, and the activity feed shows every quest solved as it happens. Only your team sees what you buy and what you get wrong.

YOUR HOSTS ARE A MESSAGE AWAY
Chat with the people running your race, or call them if something goes wrong.

HOST YOUR OWN RACE
Anyone can host. Create a game on the web, write your quests with text, pictures and videos, pick a theme, and share the invite code. Follow the teams on a live map while they race.

JOIN WITH A CODE
Got an invite code? Enter it, pick a team or start your own, and you're in.

Grand City Race uses your location only while you are playing, to unlock quests and to let your hosts help you. No ads, no tracking.
```

**What's new** (first release) — `First release.`

**Copyright — App Store** — `2026 Tim Schaeren` *(confirm the name you want shown)*

## Categories and audience

| Field                    | App Store                   | Play                         |
| ------------------------ | --------------------------- | ---------------------------- |
| Category                 | Games → Adventure           | Game → Adventure             |
| Secondary                | Entertainment               | —                            |
| Tags (Play)              | —                           | Scavenger hunt, Multiplayer, Outdoor |
| Price                    | Free                        | Free                         |
| Ads                      | —                           | No ads                       |
| Target age (Play)        | —                           | 13–15, 16–17, 18+            |

### Age rating — App Store

Answer **None / No** to everything except:

- **User-generated content**: Yes. Hosts write quests; teams chat with hosts.
- **Messaging and chat**: Yes. Each team has a chat with its hosts only.
- **Location**: the app uses location, and hosts see players' positions during a game.

Expected result: 13+.

### Content rating — Play (IARC questionnaire)

- Category: **Game**.
- Violence, sexuality, language, controlled substances, gambling: **No**.
- Users can interact or exchange content: **Yes**. Chat between a team and its hosts.
- Shares user location with other users: **Yes**. Hosts see players' positions during a game.
- Digital purchases: **No**. Coins are earned in the game, never bought.

## App privacy — App Store

**Data used to track you**: none. **Third-party advertising or analytics**: none.

Data linked to the user, all for **App Functionality** only. Not used for tracking.

| Data type                        | What it is in the app                                    |
| -------------------------------- | -------------------------------------------------------- |
| Contact Info → Name              | Name shown to your team and hosts                        |
| Contact Info → Email Address     | Sign-in                                                  |
| Location → Precise Location      | Unlocking quests, hosts' live map, team trail            |
| User Content → Emails or Text Messages | Chat with your hosts                               |
| User Content → Gameplay Content  | Team, progress, coins, answers typed, hints bought       |
| User Content → Other User Content | Team names you create                                   |
| Identifiers → User ID            | The account id                                           |
| Identifiers → Device ID          | Push notification token                                  |

Not collected: health, financial, contacts, browsing, search, purchases,
diagnostics, usage data, sensitive info.

## Data safety — Play

- Collects or shares data: **Yes, collects**. Shares with third parties: **No**.
  - Hosts seeing a player's position and messages is part of joining their game,
    and is stated in the policy. It isn't sharing with a third party.
  - Firebase, Expo and Netlify are service providers.
- Data encrypted in transit: **Yes**.
- Users can request deletion: **Yes**. In the app (Profile → Delete account) and
  at https://gcr26-dev.netlify.app/support#delete-account.
- Committed to Play Families policy: **No** (not aimed at children).

| Category → type                  | Collected | Required / optional | Purpose                              |
| -------------------------------- | --------- | ------------------- | ------------------------------------ |
| Location → Precise location      | Yes       | Required            | App functionality                    |
| Personal info → Name             | Yes       | Required            | App functionality, Account management |
| Personal info → Email address    | Yes       | Required            | Account management                   |
| Personal info → User IDs         | Yes       | Required            | App functionality, Account management |
| Messages → Other in-app messages | Yes       | Optional            | App functionality                    |
| App activity → Other user-generated content | Yes | Required      | App functionality                    |
| Device or other IDs              | Yes       | Optional            | App functionality (push notifications) |

None of it is processed ephemerally. Nothing is collected for analytics,
advertising or fraud prevention.

## App review — App Store

**Sign-in required**: yes. Username `review-player@grandcityrace.example`, password from
`review-credentials.local.md`.

**Notes** (4000):

```
Grand City Race is a scavenger hunt played in teams. A host creates a race on our website (https://gcr26-dev.netlify.app), and players join it in the app with an invite code.

HOW TO TEST
1. Sign in with the demo account above.
2. Enter the invite code PLAY26 to join "Grand City Race Demo".
3. Start a team: type any name and tap Create team.
4. Play the four quests. In a real race each quest unlocks at a place; in this demo they are all open, so it can be played anywhere. Answers: quest 2 "orange", quest 4 "race". The timer on quest 3 runs 30 seconds.
5. The menu button (top right) opens the activity feed, a chat with the hosts, and the leaderboard. The coin pill (top left) opens the shop.

LOCATION
Location unlocks quests when a team reaches a place or has walked a set distance, and lets the hosts of a game see where its teams are so they can help. Background location keeps distance quests and the team's trail working while the phone is in a pocket during a race; outside a game nothing is recorded. Before any permission prompt, the app explains what each permission is for.

ACCOUNTS
Profile (round button, top right) → Delete account deletes the account in the app.

USER-GENERATED CONTENT
Hosts write the quests of their own games, and each team has a private chat with its hosts. Players only see games they have joined with a code. Hosts can remove players; players can leave a game at any time. Reports go to the contact address on our support page (https://gcr26-dev.netlify.app/support) and our community guidelines (https://gcr26-dev.netlify.app/guidelines) apply to every game.

HOSTING (optional)
To see the host side, sign in on https://gcr26-dev.netlify.app with review-host@grandcityrace.example (password in the review field below, or on request). It hosts the demo race.
```

**Contact for review**: your name, phone and paddock-cliques5u@icloud.com.

## App access — Play

"All or some functionality is restricted": **Yes**. Add one instruction set:

- Name: `Demo race`
- Username / password: the player account from `review-credentials.local.md`
- Instructions: `Sign in, enter invite code PLAY26, create a team with any name, and play. All demo quests are open anywhere. Answers: quest 2 "orange", quest 4 "race".`

## Sensitive permissions — Play

Play Console → App content asks for both of these. One video can cover both.

### Location permissions (background location)

- **Feature that needs background location**: `Distance quests and the team trail`.
- **Description** (500):
  ```
  Grand City Race is a scavenger hunt played on foot. Some quests unlock after a team has walked a set distance, and the hosts of a race follow each team's position on a live map so they can help if a team is lost. Players keep the phone in their pocket between quests, so the app needs location while it is in the background to count the distance and keep the team's trail. Location is only collected while the player is in a game, and only the hosts of that game can see it.
  ```
- **Video** (YouTube link, unlisted is fine, 30 seconds or less). See the shot list below.

### Foreground service — location

- **Type**: Location.
- **Description**:
  ```
  While a player is in a race and has allowed background location, a foreground service with a visible notification keeps location updates running, so distance quests and the team trail work with the screen off. It stops when the player leaves the game.
  ```
- **Video**: the same one.

### Shot list for the video

Record on an Android phone, with a fresh install, or with the app's storage
cleared so the explainer shows again. Use the review account and code PLAY26.
Screen recording is in the quick settings.

1. **0–5 s** Sign in, enter the code, create a team.
2. **5–12 s** The "Before you start" screen. Hold it long enough to read the
   location text ("…even when the app is closed or not in use"), then tap Got it.
3. **12–18 s** The system prompt. Allow while using, then **Allow all the time**
   on the next screen.
4. **18–25 s** A quest screen, then press Home. Pull down the notification shade
   to show the location notification while the app is in the background.
5. **25–30 s** Optional: the host console's live map, showing the team's position.

## Between review rounds

Re-run `local/setup-review.mjs` (command in `review-credentials.local.md`). It clears the
teams reviewers created, so the next reviewer starts at the team picker.
