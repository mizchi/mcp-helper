import { assertEquals, assertMatch } from "jsr:@std/assert";
import $ from "jsr:@david/dax";

// デバッグ用にコマンドを表示
$.setPrintCommand(true);

Deno.test("getStringLength with explicit tool name", async () => {
  const { stdout } =
    await $`deno run -A lmcp.ts ./examples/getStringLength.ts getStringLength -- --input="hello"`
      .stderr("null")
      .quiet();
  assertMatch(stdout, /5/);
});

Deno.test("getStringLength with implicit tool name", async () => {
  const { stdout } =
    await $`deno run -A lmcp.ts ./examples/getStringLength.ts -- --input="hello"`
      .stderr("null")
      .quiet();
  assertMatch(stdout, /5/);
});

Deno.test("readUrl with explicit tool name", async () => {
  const { stdout } =
    await $`deno run -A lmcp.ts ./examples/readUrl.ts readUrl -- --url="https://zenn.dev/mizchi/articles/deno-mcp-server"`
      .stderr("null")
      .quiet();
  assertMatch(stdout, /## やりたいこと/);
});

Deno.test("readUrl with implicit tool name", async () => {
  const { stdout } =
    await $`deno run -A lmcp.ts ./examples/readUrl.ts -- --url="https://zenn.dev/mizchi/articles/deno-mcp-server"`
      .stderr("null")
      .quiet();
  assertMatch(stdout, /## やりたいこと/);
});

Deno.test("Error: Missing --", async () => {
  const { code, stderr } =
    await $`deno run -A lmcp.ts ./examples/getStringLength.ts`
      .noThrow()
      .quiet();
  assertEquals(code, 1);
  assertMatch(
    stderr,
    /Usage: lmcp\.ts <module_path> \[tool_name\] -- \[tool arguments\]/
  );
});

Deno.test("Error: Invalid tool name", async () => {
  const { code, stderr } =
    await $`deno run -A lmcp.ts ./examples/getStringLength.ts invalidTool -- --input="hello"`
      .noThrow()
      .quiet();
  assertEquals(code, 1);
  assertMatch(stderr, /Error calling tool: Tool invalidTool not found/);
});

Deno.test("Error: Missing required argument", async () => {
  const { code, stderr } =
    await $`deno run -A lmcp.ts ./examples/getStringLength.ts -- --invalid="hello"`
      .noThrow()
      .quiet();
  assertEquals(code, 1);
  assertMatch(
    stderr,
    /Error calling tool: Cannot read properties of undefined/
  );
});

Deno.test("Error: Module not found", async () => {
  const { code, stderr } =
    await $`deno run -A lmcp.ts ./not-exists.ts -- --input="hello"`
      .noThrow()
      .quiet();
  assertEquals(code, 1);
  assertMatch(stderr, /Failed to load module: \.\/not-exists\.ts/);
});

Deno.test("Error: No default export", async () => {
  const { code, stderr } =
    await $`deno run -A lmcp.ts ./examples/test-no-export.ts -- --input="hello"`
      .noThrow()
      .quiet();
  assertEquals(code, 1);
  assertMatch(stderr, /Server module found but no default export/);
});
