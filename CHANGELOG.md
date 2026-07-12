# Clipboard Type Changelog

## [Faster typing for long clipboard content] 2026-07-12

- Moved character-to-keycode classification into TypeScript and had AppleScript type pre-built batches instead of walking the clipboard text itself. AppleScript's own text/list access turns quadratic once it reads many individual characters, which is what made typing hundreds of lines get disproportionately slower the longer the content (this only applies when Human Cadence is off; cadence still requires per-character delays).

## [Always VM-safe keycodes] 2026-03-12

- Switched ASCII typing to US/ANSI keycode mapping by default to improve reliability in remote clients like Amazon WorkSpaces.
- Added non-ASCII fallback typing so Unicode characters are still attempted.
- Normalized clipboard line endings before typing and preserved long-run reliability with no script timeout.

## [Added human cadence typing] 2026-02-10

- Added a new preference to enable human cadence typing, which simulates more natural typing by introducing random delays between keystrokes.

## [Initial Version] - 2025-12-16
