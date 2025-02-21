/**
register mcp server

```json
{
  "mcpServers": {
    "mymcp": {
      "command": "deno",
      "args": ["run", "-A", "server.ts"],
      "env": {},
      "disabled": false,
      "alwaysAllow": []
    }
  }
}

*/
import { Server } from "npm:@modelcontextprotocol/sdk@1.5.0/server/index.js";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk@1.5.0/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolRequest,
} from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";

const TOOLS: Tool[] = [
  {
    name: "getStringLength",
    description: "Get the length of a string",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", descrption: "The input string" },
      },
      required: ["input"],
    },
  },
];
const server = new Server(
  {
    name: "mzdev",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {
        getStringLength: TOOLS[0],
      },
    },
  }
);

server.setRequestHandler(ListResourcesRequestSchema, () => ({
  resources: [],
}));

server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, (request: CallToolRequest) => {
  const name = request.params.name;
  const args = request.params.arguments ?? {};
  switch (name) {
    case "getStringLength": {
      const input = args.input as string;
      if (typeof input !== "string") {
        return {
          content: [
            {
              type: "text",
              text: `Expected input to be a string, got ${typeof input}`,
            },
          ],
          isError: true,
        };
      } else {
        console.error("[response]", input, input.length);
        return {
          content: [
            {
              type: "text",
              text: `${Array.from(input).length}`,
            },
          ],
          isError: false,
        };
      }
    }
    default: {
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
    }
  }
});

if (import.meta.main) {
  await server.connect(new StdioServerTransport());
  console.error("MCP server running on stdio");
}

/// test
// deno test -A server.ts
import { Client } from "npm:@modelcontextprotocol/sdk@1.5.0/client/index.js";
import { InMemoryTransport } from "npm:@modelcontextprotocol/sdk@1.5.0/inMemory.js";
import { expect } from "jsr:@std/expect@1.0.13";

Deno.test("getStringLength", async () => {
  const client = new Client(
    {
      name: "test client",
      version: "1.0",
    },
    {
      capabilities: {},
    }
  );
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
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
  // console.error("[result]", result);
});
