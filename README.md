# Pay Time Calculator

A small installable web app that tracks how much money you've earned in real time while a session runs. No backend, no build step — everything lives in the browser's `localStorage`.

## Features

- Multiple pay profiles: hourly rate, annual salary (implied hourly rate), or a specific pay period (date range + total pay, which implies an hourly rate given an hours/week assumption) — each with an optional overtime multiplier after a set number of hours in a session.
- Live earnings counter with Start / Take a Break / Back to Work / Stop controls. Pausing is manual — there's no idle/auto-detection.
- Session history log, kept locally.
- Export/import all data as a single JSON file (useful for backing up or moving to another browser/device).
- Light/dark theme, defaulting to the system preference, with a manual override.
- Installable as a PWA with offline support via a service worker.
- Local notifications for earning milestones, long breaks, and session goals.

## Running locally

Service workers require `http://` or `https://`, not `file://`. Serve the folder with anything static, e.g.:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploying to GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repo settings, enable **Pages** and point it at the branch/root containing these files (no build step needed).
3. Visit the published URL — all paths here are relative, so it works whether the site is served from the domain root or a `/repo-name/` subpath.

## Notification limitations

Notifications fire via the page's service worker, so they only work while the browser is open (foreground or backgrounded tab). This is a static site with no push server, so there's no way to wake a fully closed browser/app — that would require a backend push service.

## Replacing the icon

`icons/icon.svg` (plus the generated `icon-192.png` / `icon-512.png` / `apple-touch-icon.png`) is a placeholder. Swap in your own artwork at the same filenames and sizes.
