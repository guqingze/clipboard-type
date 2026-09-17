const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const sourcePath = resolve(__dirname, "../src/type-clipboard.ts");
const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
}).outputText;

async function runCommand(nativeText, readError) {
  const calls = { typing: [], failures: [], nativeReads: 0, historyReads: 0 };
  const module = { exports: {} };
  const realRequire = createRequire(sourcePath);
  const mocks = {
    "@raycast/api": {
      Clipboard: {
        readText: async () => {
          calls.historyReads++;
          return "file-dc99fbf17429e1471a7b26c49f49133f.txt";
        },
      },
      closeMainWindow: async () => {},
      getPreferenceValues: () => ({ humanCadence: false, humanCadenceSpeed: "average" }),
    },
    "@raycast/utils": {
      runAppleScript: async (_script, args) => calls.typing.push(args.slice(4)),
      showFailureToast: async (error) => calls.failures.push(error),
    },
    "node:child_process": {
      execFile: (file, args, options, callback) => {
        calls.nativeReads++;
        assert.equal(file, "/usr/bin/pbpaste");
        assert.deepEqual(Array.from(args), ["-Prefer", "txt"]);
        callback(readError, nativeText, "");
      },
    },
  };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require: (name) => mocks[name] ?? realRequire(name),
    process,
  });
  await module.exports.default();
  return calls;
}

test("types all long current clipboard text even when history contains an old filename", async () => {
  const calls = await runCommand("a\n".repeat(20000));
  const codes = calls.typing.flat().flatMap((batch) => batch.slice(1).split(",").map(Number));
  assert.equal(codes.length, 40000);
  assert.ok(codes.every((code, index) => code === (index % 2 ? 36 : 0)));
  assert.equal(calls.nativeReads, 1);
  assert.equal(calls.historyReads, 0);
});

test("preserves Unicode, tabs, and trailing newlines while normalizing line endings", async () => {
  const calls = await runCommand("a\r\n\t中\r\n\n");
  assert.equal(JSON.stringify(calls.typing), JSON.stringify([["U0,36,48", "T中", "U36,36"]]));
});

test("reports a clipboard read failure without typing an older history entry", async () => {
  const calls = await runCommand(undefined, new Error("Clipboard read failed"));
  assert.equal(calls.typing.length, 0);
  assert.equal(calls.failures.length, 1);
  assert.equal(calls.historyReads, 0);
});
