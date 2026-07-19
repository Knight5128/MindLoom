# CLAUDE.md

## Commit message convention

- The entire commit message must be in **English only**.
- Format: `<commit head>: <main commit message>`
  - `<commit head>` is one of: `feat` / `fix` / `refactor` / `docs` / `chore` / `style` / `perf` / `build` / `ci` / `test`.
- Keep the message as concise as possible, **but it must cover every key change** made in this commit (join multiple points with commas or semicolons in the same line).
- Use imperative mood, lowercase after the colon, no trailing period.

Example:

```
feat: add sleep timer for ambient audio, fade out over last 60s, auto-stop on expiry
```
