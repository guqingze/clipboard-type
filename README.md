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
- **Human Cadence** _(optional, on by default)_: Adds a random delay between keystrokes to mimic natural typing, at a configurable speed (Very Slow 200 ms down to Super Human 0 ms; default Average 50 ms). Turn it off to type long content much faster — keystrokes are then sent in batches instead of one Apple Event per character.
