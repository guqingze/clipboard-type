# Clipboard Type

**Clipboard Type** allows you to "paste" the contents of your clipboard by simulating keystrokes. This is particularly useful in situations where standard pasting is blocked, disabled, or unavailable, such as:

- **Restricted Web Forms**: Bypass restrictions on websites that disable the paste functionality in password or input fields.
- **Remote Desktop (RDP) & VNC**: Type text into remote sessions where clipboard synchronization is inactive or broken.
- **Legacy Applications**: Input text into older applications that may not support standard system paste commands.

Runs on macOS in **Raycast**. **[Tinycast](https://github.com/abue-ammar/tinycast) compatibility is experimental**: a short-text shortcut test succeeded on version **0.10.23 (build 93)** on 16 September 2026, but repeated app crashes were reported the next day. Crash reports show Tinycast aborting while launching a child process; the underlying trigger has not been established. Use Raycast if you encounter these crashes. Remote-session delivery still depends on the destination app and typing speed.

**Features:**

- **Type Clipboard Command**: Reads the current macOS clipboard directly with `pbpaste` and types it out as simulated keystrokes, without opening clipboard history.
- **VM-Safe Keycodes by Default**: Uses US/ANSI keycode mappings for ASCII characters to improve reliability in virtual desktops like Amazon WorkSpaces.
- **Smart Formatting**: Correctly handles newlines and tabs with explicit key codes and normalizes mixed line endings.
- **Unicode Fallback**: Falls back to regular keystrokes for non-ASCII characters.
- **Human Cadence** _(optional, on by default)_: Adds a random delay between keystrokes to mimic natural typing, at a configurable speed (Very Slow 200 ms down to Super Human 0 ms; default Average 50 ms). This is also the reliability knob for laggy remote sessions — a slower speed gives the remote time to keep up. Turn it off to type as fast as possible; on a slow link, very long content may drop or reorder characters, so prefer leaving it on (at Fast/Very Fast) for large pastes.

## Raycast setup

This fork is a locally-loaded (development) extension, not installed from the Raycast Store. Raycast runs a **built bundle**, not the source directly, so setting it up on a new Mac takes a build step. Do this once per machine:

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

## Tinycast setup

The steps below install the bundle, but do not resolve the known crashes described above.

Install [Tinycast](https://github.com/abue-ammar/tinycast) and [Node.js](https://nodejs.org) (LTS). Node is needed to build the extension; Raycast does not need to be running to use it in Tinycast.

1. **Get the code and dependencies**, or use your existing checkout:

   ```sh
   git clone https://github.com/guqingze/clipboard-type.git
   cd clipboard-type
   npm install
   ```

2. **Build a standalone bundle** from the repository directory:

   ```sh
   ./node_modules/.bin/ray build -e dist -o ../clipboard-type-tinycast-build --non-interactive --exit-on-error
   ```

   This creates a sibling folder containing `package.json`, `type-clipboard.js`, and `assets/`. Keep the output folder separate from the source: the build tool clears its output directory. The explicit `-e dist` produces an importable bundle; plain `npm run build` defaults to Raycast's development installation.

3. **Install in Tinycast**: open **Settings → Extensions**, enable extensions, then choose **Add from folder** and select `clipboard-type-tinycast-build`. Select the built folder, not the source checkout. Alternatively, **Import from Raycast** can copy an already-built installation of this fork.
4. **Grant permissions** in **System Settings → Privacy & Security**: enable **Tinycast** under **Accessibility** and allow it to control **System Events** if macOS prompts. If that Automation request was previously denied, enable **Tinycast → System Events** under **Automation**.
5. **Set the command shortcut**: in Tinycast's extension settings, select **Clipboard Type → Type Clipboard** and record a shortcut, for example **⌥⌘T** (Option–Command–T). Assign it to the command, separately from Tinycast's App Launcher shortcut. Remove the same binding from Raycast, disable its Type Clipboard command, or quit Raycast to avoid a conflict.
6. **Set preferences and test**: choose Human Cadence and speed in Tinycast. Imports copy the bundle, so configure preferences and shortcuts again. Copy a short sample, focus an empty TextEdit document, then physically press the shortcut. Human Cadence off types fastest; enable Human Cadence with a slower speed for remote sessions that drop characters.

Keep Tinycast running for global shortcuts to work. Enable **Launch at login** in its General settings if you want it available after signing in.

The build and import workflow follows [Tinycast's extension documentation for v0.10.23](https://github.com/abue-ammar/tinycast/blob/v0.10.23/docs/features/extensions.md#installing-extensions). This repository contains **Clipboard Type**; **Paste as Plain Text** is a separate extension with its own Tinycast compatibility requirements.

## Updating an existing install

`git pull` updates the source, but each launcher keeps its own installed bundle:

- **Raycast**: run `npm run dev` again, then press Ctrl+C once it reloads.
- **Tinycast**: rerun the standalone build command above, then add the rebuilt folder again. Pulling code or rebuilding the Raycast copy alone does not update Tinycast's copy.

### Switching back to Raycast

1. Quit Tinycast or remove its Type Clipboard shortcut so both launchers do not compete for the same keys.
2. From this repository, rebuild the Raycast installation:

   ```sh
   ./node_modules/.bin/ray build -e dev --non-interactive --exit-on-error
   ```

3. In Raycast settings, enable **Clipboard Type** and confirm the **Type Clipboard** command's hotkey. Migration may have left the extension disabled to release its shortcut.
4. Test a short sample in TextEdit. If the command is enabled but does nothing, check that `~/.config/raycast/extensions/clipboard-type/type-clipboard.js` exists for the standard Raycast installation. A saved settings entry alone does not mean the compiled command is installed; rebuilding restored this missing file during troubleshooting.

## If the Tinycast shortcut does nothing

1. Check that Tinycast is running, extensions are enabled, and Type Clipboard still has its shortcut assigned.
2. Try **Type Clipboard** from Tinycast's launcher. If it works there, check for another app using the same shortcut.
3. If the command also fails from the launcher, check Tinycast's Accessibility and System Events permissions and confirm the clipboard contains text. Retry with a short sample in TextEdit before testing a remote app.
4. If the installation may be stale, rebuild and reimport it using the update steps above.

## Development checks

```sh
node --test test/type-clipboard.test.cjs
```

These tests use mocks to check clipboard selection, long text, Unicode and line endings, and read failures. A successful build and passing tests do not verify macOS permissions, physical shortcuts, or delivery into a remote session. Test the physical shortcut in TextEdit, then verify typing in your destination app separately.
