# GCR Admin

Web admin console for Grand City Race. Built with React, Vite, and Tailwind CSS.

## Development

```bash
npm run dev
```

Opens at `http://localhost:5173`. Sign in with a Firebase account that has `isAdmin: true` in Firestore.

## Features

- **Game switcher** — select and manage games from the sidebar; last selected game is remembered across sessions
- **Quests** — per-game quest management with drag-to-reorder (dnd-kit) and Leaflet map picker
- **Teams** — create teams per game; assign players by dragging from the unassigned pool; drag between teams to reassign
- **Players** — global user list with team/game status and admin toggle
- **Delete protection** — destructive actions require typing the resource name to confirm

## Deployment

Deployed automatically to Netlify on every push to `main`. See `netlify.toml` at the repo root.
