# Contributing to Xenu's Link Sleuth — Web Edition

Thanks for helping resurrect a 1997 classic! This doc covers setup, conventions,
and — the special part — **how to reverse engineer missing behavior from the original
binary** instead of guessing.

## Setup

```bash
git clone https://github.com/acalero-shakers/xenu-link-sleuth-web.git
cd xenu-link-sleuth-web
npm install
npm run dev        # http://localhost:5173  (?demo=1 for a preloaded list)
npm run build      # must pass before any PR
```

No linter is configured yet — keep code consistent with the existing style:
plain modern JS/JSX, no TypeScript migration in PRs (it's on the roadmap as its own PR),
functional React components with hooks, no UI library (the Win95 CSS is hand-rolled in
`src/styles/win95.css` — do **not** introduce Tailwind/bootstrap).

## The golden rule: fidelity to the original

This project's value is **faithfulness to Xenu 1.3.9**. When adding or changing behavior:

1. Check how the original behaves (see "RE workflow" below).
2. Implement what the binary does — even if it looks wrong by modern standards
   (e.g. `'//' in path is an error`, `../` links marked broken, cookies off by default).
3. Document deviations in the PR description. Bug-compatible is a feature here.

The extracted spec is in [`docs/xenu_spec.json`](docs/xenu_spec.json) — menus, INI keys,
dialog texts, error strings, column lists, report sections. If your feature touches any of
those, cite the key/string you're implementing.

## Reverse-engineering workflow (REA)

The original binary (`Xenu.exe` 1.3.9, SHA-256 `fb4f14…9630`) is analyzed with
[REA](https://github.com/morluto/rea) (`npm i -g rea-agents`).

Useful commands against an extracted `Xenu.exe`:

```bash
rea inspect-pe-resources Xenu.exe --json        # resource tree (dialogs, menus, icons)
7z x Xenu.exe -ores                             # resource files as plain files (needs 7-Zip)
rea doctor                                      # which analysis engines are available
```

Resource map cheat-sheet (from our analysis):

| Resource | Content |
|---|---|
| `.rsrc/1033/MENU/128, 129` | menu templates (129 = full run menu with exports/pause/stop) |
| `.rsrc/1033/DIALOG/100, 30721` | About + generic "New" dialog |
| `.rsrc/1033/string.txt` | string table: title, doc type, command prompts |
| `.rsrc/1033/BITMAP/130.bmp` | toolbar strip: 10 buttons @16×15 |
| Options dialogs | built at runtime — extract via UTF-16 strings around file offset `0x9cd00` |
| INI keys | ASCII strings near offset `0x8e474` (`CheckExternal`, `Threads`, `MaxRetry`, …) |
| TAB export header | offset `0x93510` |
| HTML tag/attr parser tables | offset `0x93190` |

**How to ship a fidelity PR:** extract → implement → cite the offset/string in the PR body.

## Commit & PR style

- Branches: `feat/<slug>`, `fix/<slug>`, `re/<slug>` for reverse-engineering-derived work.
- Conventional commits: `feat:`, `fix:`, `docs:`, `re:` (RE findings), `chore:`.
- One behavior per PR. Include a screenshot for UI changes (Win95 chrome regressions are easy to spot).
- CI (planned): `npm run build` must pass; keep the bundle < 250 KB gzipped — we're replicating a 692 KB binary, let's stay honest.

## Priority roadmap

Vote by commenting 👍 on issues:

1. `SessionIdRegEx` URL filter (prevents URL-space explosions on session-id sites)
2. Max-URLs cap with warning dialog (the original warned about deep sites too)
3. HEAD→GET fallback on 405 responses
4. `robots.txt` toggle (default off — Xenu-faithful)
5. Session save/load (`.xen.json`)
6. German UI from `.rsrc/1031` (then EN/DE switcher)
7. Headless-browser crawl mode (optional engine for SPAs)

## Reporting bugs

Include: the URL (or a repro recipe), expected Xenu behavior (cite the FAQ/binary if you
can), actual behavior, console output. Screenshot the Win95 UI — it makes triage faster.
