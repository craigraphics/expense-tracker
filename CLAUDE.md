# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run dev          # Start dev server (http://localhost:5173)
pnpm run build        # TypeScript check + Vite production build
pnpm run lint         # ESLint on .ts/.tsx files
pnpm run preview      # Preview production build locally
pnpm run emulators    # Start Firebase emulators (Auth:9099, Firestore:8080)
pnpm test             # Vitest unit tests (src/**/*.test.ts)
```

Note: `src/firebase.ts` always talks to production Firebase (emulators are disabled), so manual testing in `pnpm run dev` uses real data.

## Architecture

React 19 + TypeScript app using Firebase (Auth + Firestore) and Vite. Styled with Tailwind CSS v4. Uses Babel React Compiler for auto-memoization.

### Styling

Design tokens live in `src/index.css` (`@theme` for light, `.dark` overrides): use semantic utilities such as `bg-canvas`, `bg-surface`, `bg-surface-2`, `border-line`, `text-fg`, `text-fg-2`, `text-fg-3`, `bg-accent`, `text-positive`/`text-negative` instead of raw grays, so both themes stay consistent. The accent is neutral ink (near-black in light, near-white in dark), so text on an accent fill uses `text-on-accent`, never `text-white`. Red/green are reserved for money status; category colors avoid red, green and purple. Radii are deliberately tiny (`rounded-xs` 2px for chips/tags, `rounded-sm` 3px for controls, `rounded-md` 4px for cards/dialogs/menus); `rounded-full` is only for true circles (avatar, spinner). Use the `num` utility for amounts (tabular figures). Category colors come from `src/utils/chartColors.ts`. Dark is the default theme; `index.html` applies the saved theme before first paint.

### Key Structure

- `src/components/` — React components. `Dashboard` composes `AppHeader`, `PeriodTimeline` (PeriodNav), `PeriodSummary`, `ExpenseList` and `CategoryBreakdown`; `Analytics` is the second view; `Login` handles Google SSO
- `src/components/ui/` — Radix dialog/toast plus shared primitives (`primitives.tsx`: Button, IconButton, Card, StatGroup/Stat, CategoryTag, Checkbox, Segmented; `styles.ts`: input/select classes)
- `src/hooks/` — Custom hooks: `useAllPeriods` (live listener on all periods, the single source of period data), `usePredictionPrefs` (pin/ignore prefs), `use-toast`
- `src/components/NewPeriodDialog.tsx` — Review dialog for setting up a period from predictions
- `src/utils/predictExpenses.ts` — Pure prediction engine for new periods
- `src/utils/yearSummary.ts` — Pure Year in Review aggregation used by Analytics
- `src/config/auth.ts` — Auth configuration, email whitelist via `VITE_AUTHORIZED_EMAILS`
- `src/types.ts` — TypeScript interfaces + period ID helpers
- `src/utils/cn.ts` — Class name utility (clsx + tailwind-merge)
- `src/firebase.ts` — Firebase initialization

### Data Model

Expenses are organized by **periods** (half-month intervals). Period IDs use format `YYYY-M-H` (e.g., "2024-5-1" = May 1-15). Firestore path: `users/{uid}/periods/{periodId}`, each containing `bankBalance` and `expenses[]` (`{ id, desc, amount, category?, paid? }`). `getPeriodIndex()` maps a period to a linear number so arithmetic works across year boundaries.

Periods are never auto-created. A missing period shows a "not set up yet" state; new periods are created through `NewPeriodDialog`, which runs `predictExpenses()` over the last 12 months. Expenses are matched by `normalizeDesc()`, and each one's rhythm (every period, every same half, every 2 months, quarterly, yearly) is detected to rank it as Fixed / Likely / Maybe. The user reviews the list before it's saved, and the starting bank balance carries over the previous period's remainder. Pin/ignore preferences live at `users/{uid}/settings/predictions` (`{ pinned: string[], ignored: string[] }` of normalized keys). Periods with no expenses are ignored by predictions and Analytics.

### Auth Flow

Google SSO via Firebase `signInWithPopup()`. After auth, the user's email is checked against `VITE_AUTHORIZED_EMAILS` (comma-separated env var). Unauthorized emails are immediately signed out.

### State Management

Local React state + Firestore `onSnapshot()` real-time listeners. No Redux or Context. Optimistic UI updates with database sync.

## Path Alias

`@/*` maps to `./src/*` (configured in tsconfig and vite.config.ts).

## Environment Variables

All prefixed with `VITE_`: Firebase config keys (`VITE_FIREBASE_API_KEY`, etc.) and `VITE_AUTHORIZED_EMAILS`.

## Deployment

Vercel (see `vercel.json`). Firestore rules live in `firestore.rules` (owner-only access to `users/{uid}/periods` and `users/{uid}/settings`) and are deployed separately with `firebase deploy --only firestore:rules`.
