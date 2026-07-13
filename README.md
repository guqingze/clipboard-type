# Clipboard Type

**Clipboard Type** allows you to "paste" the contents of your clipboard by simulating keystrokes. This is particularly useful in situations where standard pasting is blocked, disabled, or unavailable, such as:

- **Restricted Web Forms**: Bypass restrictions on websites that disable the paste functionality in password or input fields.
- **Remote Desktop (RDP) & VNC**: Type text into remote sessions where clipboard synchronization is inactive or broken.
- **Legacy Applications**: Input text into older applications that may not support standard system paste commands.

**Features:**

- **Type Clipboard Command**: Reads the latest text from your clipboard and types it out as simulated keystrokes.
- **VM-Safe Keycodes by Default**: Uses US/ANSI keycode mappings for ASCII characters to improve reliability in virtual desktops like Amazon WorkSpaces.
- **Smart Formatting**: Correctly handles newlines and tabs with explicit key codes and normalizes mixed line endings.
- **Unicode Fallback**: Falls back to regular keystrokes for non-ASCII characters.
- **Human Cadence** _(optional, on by default)_: Adds a random delay between keystrokes to mimic natural typing, at a configurable speed (Very Slow 200 ms down to Super Human 0 ms; default Average 50 ms). This is also the reliability knob for laggy remote sessions — a slower speed gives the remote time to keep up. Turn it off to type as fast as possible; on a slow link, very long content may drop or reorder characters, so prefer leaving it on (at Fast/Very Fast) for large pastes.

## Fresh Mac Setup

This is a locally-loaded (development) extension, not installed from the Raycast Store. Raycast runs a **built bundle**, not the source directly, so setting it up on a new Mac takes a build step. Do this once per machine:

1. **Install prerequisites**: [Raycast](https://raycast.com) and [Node.js](https://nodejs.org) (LTS). Node is required for Raycast's `ray` build tool.
2. **Get the code** (cloning is cleaner than copying `node_modules`, which can carry machine-specific binaries):
   ```sh
   git clone https://github.com/guqingze/clipboard-type.git
   cd clipboard-type
   ```
3. **Install dependencies**:
   ```sh
   npm install
   ```
4. **Clear macOS Gatekeeper quarantine** on the build binaries. The bundler (`esbuild`) and `ray` are unsigned, so Gatekeeper otherwise blocks the build with "cannot be opened because Apple cannot check it for malicious software":
   ```sh
   xattr -dr com.apple.quarantine node_modules
   ```
   If a binary is still blocked (can happen on Apple Silicon), run the build once, then go to **System Settings → Privacy & Security → Allow Anyway** for the blocked item and re-run.
5. **Build and load into Raycast**. This registers the **Type Clipboard** command in Raycast — there is no manual "add extension" step:
   ```sh
   npm run dev
   ```
   Once it appears in Raycast, press **Ctrl+C** to stop dev mode; the built bundle stays in place.
6. **Grant Accessibility permission** — the extension types keystrokes, so this is required or nothing happens: **System Settings → Privacy & Security → Accessibility → enable Raycast** (toggle off/on if already listed).
7. **Set the hotkey** — in Raycast, find **Type Clipboard** and record a hotkey (e.g. ⇧⌘T).

### Updating an existing install

`git pull` only updates the source. Raycast keeps running the previously built bundle until you rebuild, so after pulling, run `npm run dev` again (Ctrl+C once it reloads) to pick up the changes.
