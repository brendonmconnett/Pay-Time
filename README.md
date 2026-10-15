# Pay Time Calculator

A small installable web app that tracks how much money you've earned in real time while a session runs. No backend, no build step — everything lives in the browser's `localStorage`.

## Features

- Multiple pay profiles: hourly rate, annual salary (implied hourly rate), or a specific pay period (date range + total pay, which implies an hourly rate given an hours/week assumption) — each with an optional overtime multiplier after a set number of hours in a session.
- Live earnings counter with Start / Take a Break / Back to Work / Stop controls. Pausing is manual — there's no idle/auto-detection.
- Session history log, kept locally.
- Export/import all data as a single JSON file (useful for backing up or moving to another browser/device).
- Light/dark theme, defaulting to the system preference, with a manual override.
- Installable as a PWA with offline support via a service worker. Long-pressing the installed app's icon offers "Start session" / "Stop session" shortcuts that act on your last-selected pay profile.
- Local notifications for long breaks and session goals, each configurable as either a recurring "every X" interval or a custom list of specific thresholds.
- Dollar amounts are hidden by default behind a 4-digit passcode (`0000` until changed in Settings). Every fresh load (refresh, reopening the PWA) starts hidden again, and amounts auto-hide after a configurable period of inactivity.

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

## App shortcut limitations

The long-press "Start session" / "Stop session" shortcuts come from `manifest.json`'s `shortcuts` field. They only appear once the app is actually installed (added to home screen / installed as a desktop app), and only on platforms that support manifest shortcuts — Android Chrome and desktop Chrome/Edge (right-click the taskbar/dock icon), not iOS Safari.

## Passcode security

The passcode is a 4-digit code, hashed with SHA-256 and checked entirely client-side — there's no server to enforce anything. This is light protection against a casual glance (someone nearby, a shared device left open), not real security: anyone with access to browser devtools on this origin can read the stored hash or bypass the check outright. Don't rely on it for anything sensitive.

## Notification limitations

Notifications fire via the page's service worker, so they only work while the browser is open (foreground or backgrounded tab). This is a static site with no push server, so there's no way to wake a fully closed browser/app — that would require a backend push service.

## Replacing the icon

`icons/icon.svg` (plus the generated `icon-192.png` / `icon-512.png` / `apple-touch-icon.png`) is a placeholder. Swap in your own artwork at the same filenames and sizes.
