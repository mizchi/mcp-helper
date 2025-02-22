import { createToolsServer } from "jsr:@mizchi/mcp-helper";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk@1.5.0/server/stdio.js";
import { z } from "npm:zod@3.24.2";
import { JSDOM } from "npm:jsdom@26.0.0";
import { Readability } from "npm:@mozilla/readability";
import html2md from "npm:html-to-md";
// import { parseArgs } from "node:util";

function getExtractContent(htmlContent: string) {
  const doc = new JSDOM(htmlContent);
  const article = new Readability(doc.window.document).parse();
  if (!article) {
    throw new Error("Article not found");
  }
  // @ts-ignore unsafe
  return html2md(article!.content);
}

function trim(strings: TemplateStringsArray, ...values: any[]) {
  const result = String.raw({ raw: strings }, ...values);
  return result
    .split("\n")
    .map((s) => s.trim())
    .join("\n");
}

const tools = [
  {
    name: "readUrl",
    description: trim`
      URLを読み込み本文を抽出した結果を Markdown にします。
    `,
    inputSchema: z.object({
      url: z.string().describe("The URL to read"),
    }),
    outputSchema: z.string(),
  },
] as const;

// Create the server with type-safe handlers
const server = createToolsServer(
  {
    name: "local",
    version: "1.0.0",
  },
  tools,
  {
    async readUrl(params: { url: string }) {
      const data = await fetch(params.url).then((res) => res.text());
      const md = getExtractContent(data);
      return md;
    },
  }
);

if (import.meta.main) {
  await server.connect(new StdioServerTransport());
}

export default server;
