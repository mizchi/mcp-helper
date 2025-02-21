import { expect } from "jsr:@std/expect@1.0.13";
import { createToolsServer, createInMemoryTestClient, Tools } from "./lib.ts";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk@1.5.0/server/stdio.js";
import { z } from "npm:zod@3.24.2";

Deno.test(
  "Tool definition",
  {
    sanitizeOps: false,
  },
  async () => {
    // Example tool definition
    const tools = [
      {
        name: "getStringLength",
        description: "Get length of input string",
        inputSchema: z.object({
          input: z.string().describe("The input string"),
        }),
        outputSchema: z.number(),
      },
    ] as const satisfies Tools;

    const server = createToolsServer(
      {
        name: "test-server",
        version: "1.0.0",
      },
      tools,
      {
        getStringLength(params: { input: string }) {
          return params.input.length;
        },
      }
    );
    await server.connect(new StdioServerTransport());

    const client = await createInMemoryTestClient<typeof tools>(server);
    const result = await client.callTool("getStringLength", {
      input: "Hello, world!",
    });

    expect(result).toBe(13);

    // Cleanup
    await Promise.all([client.close(), server.close()]);
  }
);
