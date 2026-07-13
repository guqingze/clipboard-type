# Clipboard Type Changelog

## [Fix corrupted long pastes into remote sessions] 2026-07-13

- Long pastes into remote sessions (e.g. Amazon WorkSpaces) could drop or reorder characters near the end of the content. Comparing against the last known-correct version pinpointed the cause: the previous performance change bundled two things — moving keycode mapping into TypeScript (the real, safe speedup) *and* sending each run of keys as a single `key code {list}` burst. That burst is what arrived dropped/reordered over a laggy remote link. Delivery is now back to one key event per character (matching the version that typed correctly), while keeping the TypeScript-mapping speedup. Batching is retained purely as a transport detail (to stay under argv limits) and no longer affects how keys are sent.
- For reliable pasting into a laggy remote session, keep Human Cadence on and pick a speed — that is the pacing knob. With Human Cadence off, characters are sent as fast as possible (best effort), which may still corrupt very long content on a slow link.
- Wrapped the typing loop in `with timeout of 86400 seconds` so long, paced pastes (which can legitimately run for several minutes) are no longer aborted partway through by AppleScript's default 120-second Apple Event timeout.

## [Faster typing for long clipboard content] 2026-07-12

- Moved character-to-keycode classification into TypeScript and had AppleScript type pre-built batches instead of walking the clipboard text itself. AppleScript's own text/list access turns quadratic once it reads many individual characters, which is what made typing hundreds of lines get disproportionately slower the longer the content (this only applies when Human Cadence is off; cadence still requires per-character delays).

## [Always VM-safe keycodes] 2026-03-12

- Switched ASCII typing to US/ANSI keycode mapping by default to improve reliability in remote clients like Amazon WorkSpaces.
- Added non-ASCII fallback typing so Unicode characters are still attempted.
- Normalized clipboard line endings before typing and preserved long-run reliability with no script timeout.

## [Added human cadence typing] 2026-02-10

- Added a new preference to enable human cadence typing, which simulates more natural typing by introducing random delays between keystrokes.

## [Initial Version] - 2025-12-16
