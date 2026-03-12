import { Clipboard, closeMainWindow, getPreferenceValues } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export default async function Command() {
  const latestClipboardItem = await Clipboard.readText();

  // If clipboard is empty show Toast and return
  if (!latestClipboardItem) {
    await showFailureToast("Clipboard is empty");
    return;
  }
  await closeMainWindow();
  const { humanCadence, humanCadenceSpeed } = getPreferenceValues<Preferences>();

  const humanCadenceSpeeds = {
    "very-slow": { min: 0.1, max: 0.3 },
    slow: { min: 0.05, max: 0.15 },
    average: { min: 0.02, max: 0.1 },
    fast: { min: 0.01, max: 0.05 },
    "very-fast": { min: 0.005, max: 0.02 },
    "super-human": { min: 0, max: 0.001 },
  };

  const humanCadenceRange = humanCadenceSpeeds[humanCadenceSpeed] ?? humanCadenceSpeeds.average;

  const appleScriptContent = `
on run argv
set theText to item 1 of argv
set shouldUseCadence to item 2 of argv is "true"
set minDelay to item 3 of argv as real
set maxDelay to item 4 of argv as real

delay 0.2
tell application "System Events"
  repeat with ch in characters of theText
    set c to contents of ch
    if c is return or c is linefeed then
      key code 36
    else if c is tab then
      key code 48
    else
      keystroke c
    end if

    if shouldUseCadence then
      delay (random number from minDelay to maxDelay)
    end if
  end repeat
end tell
end run
`;

  // Execute the AppleScript using osascript directly
  try {
    await runAppleScript(
      appleScriptContent,
      [latestClipboardItem, String(humanCadence), String(humanCadenceRange.min), String(humanCadenceRange.max)],
      { timeout: 0 },
    );
  } catch (error) {
    await showFailureToast(error);
  }
}
