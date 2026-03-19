# GCR Admin

Web admin console for Grand City Race. Built with React, Vite, and Tailwind CSS.

## Development

```bash
npm run dev
```

Opens at `http://localhost:5173`. Sign in with a Firebase account that has `isAdmin: true` in Firestore.

## Features

- **Games** — create, edit, and delete race events; geocodes city to coordinates via Nominatim
- **Quests** — per-game quest management with drag-to-reorder (dnd-kit) and Leaflet map picker
- **Delete protection** — destructive actions require typing the resource name to confirm

## Deployment

Deployed automatically to Netlify on every push to `main`. See `netlify.toml` at the repo root.
