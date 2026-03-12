# Clipboard Type

**Clipboard Type** allows you to "paste" the contents of your clipboard by simulating keystrokes. This is particularly useful in situations where standard pasting is blocked, disabled, or unavailable, such as:

- **Restricted Web Forms**: Bypass restrictions on websites that disable the paste functionality in password or input fields.
- **Remote Desktop (RDP) & VNC**: Type text into remote sessions where clipboard synchronization is inactive or broken.
- **Legacy Applications**: Input text into older applications that may not support standard system paste commands.

**Features:**

- **Type Clipboard Command**: Reads the latest text from your clipboard and types it out character by character.
- **VM-Safe Keycodes by Default**: Uses US/ANSI keycode mappings for ASCII characters to improve reliability in virtual desktops like Amazon WorkSpaces.
- **Smart Formatting**: Correctly handles newlines and tabs with explicit key codes and normalizes mixed line endings.
- **Unicode Fallback**: Falls back to regular keystrokes for non-ASCII characters.
- **Configurable Speed**: Choose a preset typing delay (dropdown from 1s down to 0.5ms, default 2ms) to match slow remote sessions or fast local input.
