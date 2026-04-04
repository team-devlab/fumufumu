# AGENTS.md

## Scope
- This file applies to the entire repository (the directory containing this `AGENTS.md`) and all subdirectories.

## Security and Privacy
- Never include personal names, usernames, or other personally identifiable strings in assistant output.
- Never include absolute paths that expose home directory information.
- In explanations, commit messages, and reviews, use repository-relative paths only.
- If a tool requires an absolute path internally, do not echo that absolute path back to the user.

## Frontend Rule: Avoid `useEffect`
- In this repository, do not use `useEffect` by default.
- Prefer these alternatives first:
  - Server Components / server-side data fetching
  - Event handlers (`onClick`, `onChange`, `onBlur`, `onKeyDown`, etc.)
  - Derived values from props/state
  - `useMemo` / `useCallback`
  - `ref`-based handling without global event subscriptions
  - CSS and framework features

## Allowed Exceptions
- `useEffect` is allowed only when there is no practical alternative, such as:
  - Subscribing/unsubscribing browser or external events
  - Integrating imperative third-party libraries that require lifecycle sync
  - Cleanup that is necessary to prevent leaks or invalid behavior

## If `useEffect` Is Unavoidable
- Add a short reason in code comments.
- Keep dependencies minimal and correct.
- Do not use `useEffect` for logic that can be handled during render or by event handlers.
- Do not use client-side `useEffect` for data fetching when server-side fetching is feasible.
