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
  const normalizedClipboardText = latestClipboardItem.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

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
property letterKeyCodes : {0, 11, 8, 2, 14, 3, 5, 4, 34, 38, 40, 37, 46, 45, 31, 35, 12, 15, 1, 17, 32, 9, 13, 7, 16, 6}
property digitKeyCodes : {29, 18, 19, 20, 21, 23, 22, 26, 28, 25}

on mappingForCode(charCode)
  if charCode is 9 then
    return {48, false}
  end if

  if charCode is 10 or charCode is 13 then
    return {36, false}
  end if

  if charCode is 32 then
    return {49, false}
  end if

  if charCode is greater than or equal to 97 and charCode is less than or equal to 122 then
    set letterIndex to charCode - 96
    return {item letterIndex of letterKeyCodes, false}
  end if

  if charCode is greater than or equal to 65 and charCode is less than or equal to 90 then
    set letterIndex to charCode - 64
    return {item letterIndex of letterKeyCodes, true}
  end if

  if charCode is greater than or equal to 48 and charCode is less than or equal to 57 then
    set digitIndex to charCode - 47
    return {item digitIndex of digitKeyCodes, false}
  end if

  if charCode is 33 then
    return {18, true}
  end if

  if charCode is 34 then
    return {39, true}
  end if

  if charCode is 35 then
    return {20, true}
  end if

  if charCode is 36 then
    return {21, true}
  end if

  if charCode is 37 then
    return {23, true}
  end if

  if charCode is 38 then
    return {26, true}
  end if

  if charCode is 39 then
    return {39, false}
  end if

  if charCode is 40 then
    return {25, true}
  end if

  if charCode is 41 then
    return {29, true}
  end if

  if charCode is 42 then
    return {28, true}
  end if

  if charCode is 43 then
    return {24, true}
  end if

  if charCode is 44 then
    return {43, false}
  end if

  if charCode is 45 then
    return {27, false}
  end if

  if charCode is 46 then
    return {47, false}
  end if

  if charCode is 47 then
    return {44, false}
  end if

  if charCode is 58 then
    return {41, true}
  end if

  if charCode is 59 then
    return {41, false}
  end if

  if charCode is 60 then
    return {43, true}
  end if

  if charCode is 61 then
    return {24, false}
  end if

  if charCode is 62 then
    return {47, true}
  end if

  if charCode is 63 then
    return {44, true}
  end if

  if charCode is 64 then
    return {19, true}
  end if

  if charCode is 91 then
    return {33, false}
  end if

  if charCode is 92 then
    return {42, false}
  end if

  if charCode is 93 then
    return {30, false}
  end if

  if charCode is 94 then
    return {22, true}
  end if

  if charCode is 95 then
    return {27, true}
  end if

  if charCode is 96 then
    return {50, false}
  end if

  if charCode is 123 then
    return {33, true}
  end if

  if charCode is 124 then
    return {42, true}
  end if

  if charCode is 125 then
    return {30, true}
  end if

  if charCode is 126 then
    return {50, true}
  end if

  return missing value
end mappingForCode

on run argv
set theText to item 1 of argv
set shouldUseCadence to item 2 of argv is "true"
set minDelay to item 3 of argv as real
set maxDelay to item 4 of argv as real

delay 0.2
tell application "System Events"
  repeat with ch in characters of theText
    set c to contents of ch

    set mappedKey to missing value
    try
      set mappedKey to my mappingForCode(id of c)
    on error
      set mappedKey to missing value
    end try

    if mappedKey is missing value then
      keystroke c
    else
      set keyCodeValue to item 1 of mappedKey
      set shouldPressShift to item 2 of mappedKey

      if shouldPressShift then
        key code keyCodeValue using shift down
      else
        key code keyCodeValue
      end if
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
      [normalizedClipboardText, String(humanCadence), String(humanCadenceRange.min), String(humanCadenceRange.max)],
      { timeout: 0 },
    );
  } catch (error) {
    await showFailureToast(error);
  }
}
