#!/usr/bin/env -S deno run --watch --allow-net --allow-env --allow-run --allow-sys --allow-read --allow-write

// Simple implementation on deno server
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

await server.connect(new StdioServerTransport());
console.error("MCP server running on stdio");
