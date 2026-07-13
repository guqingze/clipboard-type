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
// replay:
//   "T<text>"   -> `keystroke` each character (used for unmapped characters)
//   "U<codes>"  -> `key code <code>` per character (unshifted)
//   "S<codes>"  -> `key code <code> using shift down` per character (shifted)
// Batching here is ONLY a transport optimization so we don't hand osascript one
// argv item per character (which would blow past ARG_MAX on long pastes).
// Regardless of batch size, the AppleScript side always emits ONE key event per
// character. An earlier version sent a whole run as a single `key code {list}`
// action; that burst is what caused characters to arrive dropped/reordered in
// remote sessions (e.g. Amazon WorkSpaces). Per-character delivery matches the
// version that typed correctly. Pacing for reliability is Human Cadence's job.
const MAX_BATCH_LENGTH = 100;

// Delay after each keystroke when Human Cadence is off: none. This mirrors the
// last known-correct version, whose only "slowness" came from AppleScript's own
// O(n^2) character walk (now removed). For reliable long pastes into a laggy
// remote session, turn Human Cadence on and pick a speed — that is the knob.
const FAST_KEYSTROKE_DELAY = 0;

function buildTypingBatches(text: string): string[] {
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
      nextMode === "text" ? textBuffer.length >= MAX_BATCH_LENGTH : codeBuffer.length >= MAX_BATCH_LENGTH;

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

  // Each batch is "<tag><payload>". "T" is literal text; "U"/"S" are
  // comma-separated keycodes. Batches are only a transport grouping — the
  // loop below always emits ONE key event per character (per-character
  // `key code`, with Shift applied atomically per shifted character via
  // `using shift down`). This is the delivery that typed correctly; sending a
  // run as a single `key code {list}` burst is what corrupted long pastes. A
  // per-keystroke delay (Human Cadence's random delay, or none when off) is
  // applied after every character.
  const appleScriptContent = `
on run argv
set shouldUseCadence to item 1 of argv is "true"
set minDelay to item 2 of argv as real
set maxDelay to item 3 of argv as real
set keystrokeDelay to item 4 of argv as real
set batchArgs to items 5 thru -1 of argv

delay 0.2
-- A long paste (Human Cadence on) can run for many minutes. Without this
-- guard, AppleScript's default 120-second Apple Event timeout aborts the run
-- partway through, leaving the content half-typed. 86400s (a day) effectively
-- disables it for any realistic paste.
with timeout of 86400 seconds
tell application "System Events"
  repeat with batchArgRef in batchArgs
    set batchArg to batchArgRef as text
    set tag to text 1 thru 1 of batchArg
    set payload to text 2 thru -1 of batchArg

    if tag is "T" then
      repeat with i from 1 to (count of payload)
        keystroke (character i of payload)
        my pace(shouldUseCadence, minDelay, maxDelay, keystrokeDelay)
      end repeat
    else
      set oldDelims to AppleScript's text item delimiters
      set AppleScript's text item delimiters to ","
      set codeStrs to text items of payload
      set AppleScript's text item delimiters to oldDelims

      set useShift to tag is "S"
      repeat with codeStr in codeStrs
        if useShift then
          key code (codeStr as integer) using shift down
        else
          key code (codeStr as integer)
        end if
        my pace(shouldUseCadence, minDelay, maxDelay, keystrokeDelay)
      end repeat
    end if
  end repeat
end tell
end timeout
end run

on pace(shouldUseCadence, minDelay, maxDelay, keystrokeDelay)
  if shouldUseCadence then
    delay (random number from minDelay to maxDelay)
  else if keystrokeDelay > 0 then
    delay keystrokeDelay
  end if
end pace
`;

  const batches = buildTypingBatches(normalizedClipboardText);
  const args = [
    String(humanCadence),
    String(humanCadenceRange.min),
    String(humanCadenceRange.max),
    String(FAST_KEYSTROKE_DELAY),
    ...batches,
  ];

  // Execute the AppleScript using osascript directly
  try {
    await runAppleScript(appleScriptContent, args, { timeout: 0 });
  } catch (error) {
    await showFailureToast(error);
  }
}
