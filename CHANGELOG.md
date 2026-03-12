# Clipboard Type Changelog

## [Always VM-safe keycodes] 2026-03-12

- Switched ASCII typing to US/ANSI keycode mapping by default to improve reliability in remote clients like Amazon WorkSpaces.
- Added non-ASCII fallback typing so Unicode characters are still attempted.
- Normalized clipboard line endings before typing and preserved long-run reliability with no script timeout.

## [Added human cadence typing] 2026-02-10

- Added a new preference to enable human cadence typing, which simulates more natural typing by introducing random delays between keystrokes.

## [Initial Version] - 2025-12-16
