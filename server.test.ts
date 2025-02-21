import { Client } from "npm:@modelcontextprotocol/sdk@1.5.0/client/index.js";
import { StdioClientTransport } from "npm:@modelcontextprotocol/sdk@1.5.0/client/stdio.js";
import { expect } from "jsr:@std/expect@1.0.13";

Deno.test(
  "getStringLength",
  {
    sanitizeResources: false,
    sanitizeOps: false,
  },
  async () => {
    const client = new Client(
      {
        name: "example-client",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {}, // ツールを使用するためのcapabilityを設定
        },
      }
    );
    // stdioトランスポートの設定
    const transport = new StdioClientTransport({
      command: "/home/mizchi/.deno/bin/deno",
      args: ["run", "-A", "server.ts"],
      cwd: "/home/mizchi/mcp",
    });

    await client.connect(transport);
    const result = await client.callTool({
      name: "getStringLength",
      arguments: {
        input: "Hello, world!",
      },
    });
    expect(result).toEqual({
      content: [{ type: "text", text: "13" }],
      isError: false,
    });
  }
);
