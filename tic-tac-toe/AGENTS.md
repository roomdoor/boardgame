# Agent Guide for tic-tac-toe

This file is for coding agents working in this repository.
Keep changes minimal, follow existing patterns, and avoid adding new tooling
unless explicitly requested.

## Scope
- Project root: /Users/sihwa/IdeaProjects/boardgame/tic-tac-toe
- Client is static HTML/CSS/JS.
- Server is a small Node.js WebSocket app under `server/`.

## Commands

### Install
- Server dependencies:
  - `cd /Users/sihwa/IdeaProjects/boardgame/tic-tac-toe/server`
  - `npm install`

### Run
- Local UI (no server): open `index.html` in a browser.
- WebSocket server:
  - `cd /Users/sihwa/IdeaProjects/boardgame/tic-tac-toe/server`
  - `node index.js`
- Custom port:
  - `PORT=4000 node index.js`
  - Update the WebSocket URL in `script.js` if port changes.

### Test / Lint / Build
- No build or lint tooling is configured.
- Server `npm test` exists but is a placeholder and exits with error:
  - `cd /Users/sihwa/IdeaProjects/boardgame/tic-tac-toe/server`
  - `npm test`
- No single-test command is available.

## Cursor / Copilot Rules
- No `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md`
  were found at the time of writing.

## Code Style (Observed)

### General
- Indentation: 2 spaces.
- Avoid unnecessary refactors. Prefer minimal, localized changes.
- Use early returns for invalid state and input validation.

### HTML
- Use semantic structure and clear IDs.
- Class names are lowercase with hyphens.
- Attributes are wrapped across lines for readability.
- Example files: `index.html`.

### CSS
- Use CSS variables in `:root` for theme colors.
- One selector per block.
- Use `var(...)` consistently for theme colors.
- Prefer descriptive class names that map to UI intent.
- Example files: `styles.css`.

### Client JS (script.js)
- Use `const` for references and helpers, `let` for mutable state.
- Function names are `camelCase`.
- DOM elements are stored in variables with `El` or descriptive suffixes
  (e.g., `statusEl`, `resetButton`).
- Guard clauses first, then main logic.
- Prefer small helper functions for UI updates.
- Avoid side effects in pure helpers (e.g., `getWinner`).

### Server JS (server/index.js)
- CommonJS modules (`require`/`module.exports`).
- Constants in `UPPER_SNAKE` only when appropriate (e.g., `PORT`).
- Keep WebSocket message handling in a single `message` handler.
- Validate payload shape and values before acting.
- Broadcast updates via helper functions (`send`, `broadcast`).

## Naming Conventions
- `camelCase` for variables, functions, and object keys.
- `UPPER_SNAKE` for top-level constants only when fixed.
- Boolean state is descriptive (`gameActive`, `aiLocked`, `connected`).
- Room codes are uppercase strings.

## Formatting Conventions
- Use trailing commas in multi-line arrays/objects.
- Use spaces inside parentheses for control flow (e.g., `if (x)`).
- Keep lines readable; wrap long HTML attributes and long strings.

## Error Handling
- Prefer guard clauses and return early on invalid input.
- For WebSocket errors, send payloads like:
  - `{ type: "error", message: "..." }`
- Do not swallow JSON parse errors; respond with an error message.

## Client Behavior Notes
- Local mode uses minimax; keep AI updates async via timeout.
- Online mode uses `ws://localhost:3000` by default.
- The board is driven by state array of length 9.
- Visual win highlight uses the `win` CSS class.

## Server Behavior Notes
- Rooms are tracked in a Map keyed by room code.
- Each room has up to 2 clients.
- `X` goes first, `O` joins.
- Server is stateful and does not persist data.

## When Changing Behavior
- If you change server port or URL, update `script.js` accordingly.
- If you add a new command, document it here and in `README.md`.
- If you add tooling (lint/test/build), keep it simple and documented.

## Files of Interest
- `index.html`
- `styles.css`
- `script.js`
- `server/index.js`
- `server/package.json`
- `README.md`

## Non-Goals
- No build system or bundler is in use.
- No framework-specific conventions apply.

## Agent Checklist
- Keep edits focused; avoid sweeping refactors.
- Follow existing patterns in HTML/CSS/JS.
- Update documentation when behavior or commands change.
- Do not introduce new dependencies without a request.
