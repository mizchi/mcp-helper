import $ from "jsr:@david/dax";
import { assertEquals } from "jsr:@std/assert";

// デバッグ用にコマンドを表示
$.setPrintCommand(true);

function truncateOutput(output: string, maxLines = 10): string {
  const lines = output.split("\n");
  if (lines.length > maxLines) {
    return lines.slice(0, maxLines).join("\n") + "\n... (output truncated)";
  }
  return output;
}

Deno.test("getStringLength with explicit tool name", async () => {
  const result =
    await $`deno run -A lmcp.ts ./examples/getStringLength.ts getStringLength -- --input="hello"`.text();
  console.log(truncateOutput(result));
  assertEquals(result.includes("Result: 5"), true);
});

Deno.test("getStringLength with implicit tool name", async () => {
  const result =
    await $`deno run -A lmcp.ts ./examples/getStringLength.ts -- --input="hello"`.text();
  console.log(truncateOutput(result));
  assertEquals(result.includes("Result: 5"), true);
});

Deno.test("readUrl with explicit tool name", async () => {
  const result =
    await $`deno run -A lmcp.ts ./examples/readUrl.ts readUrl -- --url="https://zenn.dev/mizchi/articles/deno-mcp-server"`.text();
  console.log(truncateOutput(result));
  assertEquals(result.includes("## やりたいこと"), true);
});

Deno.test("readUrl with implicit tool name", async () => {
  const result =
    await $`deno run -A lmcp.ts ./examples/readUrl.ts -- --url="https://zenn.dev/mizchi/articles/deno-mcp-server"`.text();
  console.log(truncateOutput(result));
  assertEquals(result.includes("## やりたいこと"), true);
});

Deno.test("Error: Missing --", async () => {
  const { code, stderr } =
    await $`deno run -A lmcp.ts ./examples/getStringLength.ts`
      .noThrow()
      .quiet();
  console.log(stderr);
  assertEquals(code, 1);
  assertEquals(stderr.includes("Usage:"), true);
});

Deno.test("Error: Invalid tool name", async () => {
  const { code, stderr } =
    await $`deno run -A lmcp.ts ./examples/getStringLength.ts invalidTool -- --input="hello"`
      .noThrow()
      .quiet();
  console.log(stderr);
  assertEquals(code, 1);
  assertEquals(stderr.includes("Error calling tool"), true);
});

Deno.test("Error: Missing required argument", async () => {
  const { code, stderr } =
    await $`deno run -A lmcp.ts ./examples/getStringLength.ts -- --invalid="hello"`
      .noThrow()
      .quiet();
  console.log(stderr);
  assertEquals(code, 1);
  assertEquals(stderr.includes("Error calling tool"), true);
});
