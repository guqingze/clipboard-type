import { Clipboard, closeMainWindow, getPreferenceValues } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

// Single source of truth for character -> US/ANSI keycode mapping. Using
// explicit keycodes (rather than letting `keystroke` interpret the text)
// avoids symbol misinterpretation in remote clients like Amazon WorkSpaces.
// Characters with no mapping (e.g. non-ASCII Unicode) fall back to a literal
// `keystroke`. This lives here in TypeScript so the AppleScript side never has
// to walk the clipboard text itself, whose per-character access is O(n^2) in
// AppleScript and made long content type disproportionately slowly.
const LETTER_KEY_CODES = [0, 11, 8, 2, 14, 3, 5, 4, 34, 38, 40, 37, 46, 45, 31, 35, 12, 15, 1, 17, 32, 9, 13, 7, 16, 6];
const DIGIT_KEY_CODES = [29, 18, 19, 20, 21, 23, 22, 26, 28, 25];
const PUNCTUATION_KEY_CODES: Record<number, [keyCode: number, shift: boolean]> = {
  33: [18, true], // !
  34: [39, true], // "
  35: [20, true], // #
  36: [21, true], // $
  37: [23, true], // %
  38: [26, true], // &
  39: [39, false], // '
  40: [25, true], // (
  41: [29, true], // )
  42: [28, true], // *
  43: [24, true], // +
  44: [43, false], // ,
  45: [27, false], // -
  46: [47, false], // .
  47: [44, false], // /
  58: [41, true], // :
  59: [41, false], // ;
  60: [43, true], // <
  61: [24, false], // =
  62: [47, true], // >
  63: [44, true], // ?
  64: [19, true], // @
  91: [33, false], // [
  92: [42, false], // backslash
  93: [30, false], // ]
  94: [22, true], // ^
  95: [27, true], // _
  96: [50, false], // `
  123: [33, true], // {
  124: [42, true], // |
  125: [30, true], // }
  126: [50, true], // ~
};

function mapCharCode(code: number): { keyCode: number; shift: boolean } | null {
  if (code === 9) return { keyCode: 48, shift: false }; // tab
  if (code === 10 || code === 13) return { keyCode: 36, shift: false }; // newline / return
  if (code === 32) return { keyCode: 49, shift: false }; // space
  if (code >= 97 && code <= 122) return { keyCode: LETTER_KEY_CODES[code - 97], shift: false };
  if (code >= 65 && code <= 90) return { keyCode: LETTER_KEY_CODES[code - 65], shift: true };
  if (code >= 48 && code <= 57) return { keyCode: DIGIT_KEY_CODES[code - 48], shift: false };
  const punctuation = PUNCTUATION_KEY_CODES[code];
  if (punctuation) return { keyCode: punctuation[0], shift: punctuation[1] };
  return null;
}

// Encode the clipboard text as a list of batches the AppleScript side can
// replay directly:
//   "T<text>"   -> `keystroke` a literal run (used for unmapped characters)
//   "U<codes>"  -> `key code {codes}` (unshifted keycodes)
//   "S<codes>"  -> `key code {codes} using shift down` (shifted keycodes)
// When `mergeRuns` is true (no Human Cadence) consecutive characters sharing a
// mode are merged into one batch, collapsing thousands of Apple Events into a
// handful. When false (Human Cadence), every character is its own batch so the
// AppleScript loop can insert a delay after each keystroke.
const MAX_BATCH_LENGTH = 300;

function buildTypingBatches(text: string, mergeRuns: boolean): string[] {
  const batches: string[] = [];
  let mode: "text" | "unshift" | "shift" | null = null;
  let textBuffer = "";
  let codeBuffer: number[] = [];

  const flush = () => {
    if (mode === "text" && textBuffer) {
      batches.push(`T${textBuffer}`);
    } else if ((mode === "unshift" || mode === "shift") && codeBuffer.length > 0) {
      batches.push(`${mode === "shift" ? "S" : "U"}${codeBuffer.join(",")}`);
    }
    textBuffer = "";
    codeBuffer = [];
  };

  for (let i = 0; i < text.length; i++) {
    const mapped = mapCharCode(text.charCodeAt(i));
    const nextMode = mapped ? (mapped.shift ? "shift" : "unshift") : "text";
    const bufferIsFull =
      !mergeRuns ||
      (nextMode === "text" ? textBuffer.length >= MAX_BATCH_LENGTH : codeBuffer.length >= MAX_BATCH_LENGTH);

    if (nextMode !== mode || bufferIsFull) {
      flush();
      mode = nextMode;
    }

    if (nextMode === "text") {
      textBuffer += text[i];
    } else {
      codeBuffer.push(mapped!.keyCode);
    }
  }
  flush();

  return batches;
}

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

  // Each batch is "<tag><payload>": tag "T" is literal text to `keystroke`,
  // "U"/"S" are comma-separated keycodes to send unshifted / shifted. When
  // Human Cadence is on, batches are one character each and a random delay is
  // inserted after every keystroke.
  const appleScriptContent = `
on run argv
set shouldUseCadence to item 1 of argv is "true"
set minDelay to item 2 of argv as real
set maxDelay to item 3 of argv as real
set batchArgs to items 4 thru -1 of argv

delay 0.2
tell application "System Events"
  repeat with batchArgRef in batchArgs
    set batchArg to batchArgRef as text
    set tag to text 1 thru 1 of batchArg
    set payload to text 2 thru -1 of batchArg

    if tag is "T" then
      keystroke payload
    else
      set oldDelims to AppleScript's text item delimiters
      set AppleScript's text item delimiters to ","
      set codeStrs to text items of payload
      set AppleScript's text item delimiters to oldDelims

      set codes to {}
      repeat with codeStr in codeStrs
        set end of codes to (codeStr as integer)
      end repeat

      if tag is "S" then
        key code codes using shift down
      else
        key code codes
      end if
    end if

    if shouldUseCadence then
      delay (random number from minDelay to maxDelay)
    end if
  end repeat
end tell
end run
`;

  const batches = buildTypingBatches(normalizedClipboardText, !humanCadence);
  const args = [String(humanCadence), String(humanCadenceRange.min), String(humanCadenceRange.max), ...batches];

  // Execute the AppleScript using osascript directly
  try {
    await runAppleScript(appleScriptContent, args, { timeout: 0 });
  } catch (error) {
    await showFailureToast(error);
  }
}
