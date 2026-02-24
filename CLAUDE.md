# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run dev          # Start dev server (http://localhost:5173)
pnpm run build        # TypeScript check + Vite production build
pnpm run lint         # ESLint on .ts/.tsx files
pnpm run preview      # Preview production build locally
pnpm run emulators    # Start Firebase emulators (Auth:9099, Firestore:8080)
```

No test framework is currently configured.

## Architecture

React 19 + TypeScript app using Firebase (Auth + Firestore) and Vite. Styled with Tailwind CSS v4. Uses Babel React Compiler for auto-memoization.

### Key Structure

- `src/components/` — React components (Dashboard is the main expense UI, Login handles Google SSO)
- `src/components/ui/` — Radix UI/shadcn-style primitives (dialog, toast)
- `src/hooks/` — Custom hooks (use-toast)
- `src/config/auth.ts` — Auth configuration, email whitelist via `VITE_AUTHORIZED_EMAILS`
- `src/types.ts` — TypeScript interfaces + period ID helpers
- `src/utils/cn.ts` — Class name utility (clsx + tailwind-merge)
- `src/firebase.ts` — Firebase initialization

### Data Model

Expenses are organized by **periods** (half-month intervals). Period IDs use format `YYYY-M-H` (e.g., "2024-5-1" = May 1-15). Firestore path: `users/{uid}/periods/{periodId}`, each containing `bankBalance` and `expenses[]`.

January periods serve as templates — when creating a new period, expenses are copied from the matching January half of the same year (e.g., a 1st-half period copies from Jan 1st, a 2nd-half period copies from Jan 2nd).

### Auth Flow

Google SSO via Firebase `signInWithPopup()`. After auth, the user's email is checked against `VITE_AUTHORIZED_EMAILS` (comma-separated env var). Unauthorized emails are immediately signed out.

### State Management

Local React state + Firestore `onSnapshot()` real-time listeners. No Redux or Context. Optimistic UI updates with database sync.

## Path Alias

`@/*` maps to `./src/*` (configured in tsconfig and vite.config.ts).

## Environment Variables

All prefixed with `VITE_`: Firebase config keys (`VITE_FIREBASE_API_KEY`, etc.) and `VITE_AUTHORIZED_EMAILS`.

## Deployment

Vercel (see `vercel.json`). Firebase Firestore rules are currently open (allow all) — development mode only.
