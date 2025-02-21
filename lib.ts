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
import { Client } from "npm:@modelcontextprotocol/sdk@1.5.0/client/index.js";
import { InMemoryTransport } from "npm:@modelcontextprotocol/sdk@1.5.0/inMemory.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
} from "npm:@modelcontextprotocol/sdk@1.5.0/types.js";
import { z } from "npm:zod@3.24.2";
import { zodToJsonSchema } from "npm:zod-to-json-schema@3.24.2";

// Tool definition type
export type Tool = {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  outputSchema: z.ZodType;
};

// Tools array type
export type Tools = readonly Tool[];

// Infer available tools from Tools type
export type InferAvailableTools<T extends Tools> = {
  [K in T[number]["name"]]: {
    input: z.infer<Extract<T[number], { name: K }>["inputSchema"]>;
    output: z.infer<Extract<T[number], { name: K }>["outputSchema"]>;
  };
};

// Server info type
export type ServerInfo = {
  name: string;
  version: string;
};

// Handler map type
export type HandlerMap<T extends Tools> = {
  [K in T[number]["name"]]: (
    params: z.infer<Extract<T[number], { name: K }>["inputSchema"]>
  ) =>
    | z.infer<Extract<T[number], { name: K }>["outputSchema"]>
    | Promise<z.infer<Extract<T[number], { name: K }>["outputSchema"]>>;
};

// Create a type-safe client for testing
export async function createInMemoryTestClient<T extends Tools>(
  server: Server
) {
  const client = new Client(
    {
      name: "test-client",
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

  return {
    async callTool<K extends T[number]["name"]>(
      name: K,
      args: InferAvailableTools<T>[K]["input"]
    ): Promise<InferAvailableTools<T>[K]["output"]> {
      const result = await client.callTool({
        name: name,
        arguments: args,
      });

      if (!result || typeof result !== "object") {
        throw new Error("Invalid response format");
      }

      const { isError, content } = result as {
        isError: boolean;
        content?: Array<{ type: string; text: string }>;
      };

      if (isError || !content?.[0]?.text) {
        throw new Error(content?.[0]?.text ?? "Unknown error");
      }

      return JSON.parse(content[0].text);
    },
    async close() {
      await client.close();
    },
  };
}

export function createToolsServer<T extends Tools>(
  info: ServerInfo,
  tools: T,
  handlers: HandlerMap<T>
) {
  // Convert tool definitions to MCP Tool format
  const toolList = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: zodToJsonSchema(tool.inputSchema) as {
      type: "object";
      properties: Record<string, unknown>;
    },
  }));

  const server = new Server(info, {
    capabilities: {
      resources: {},
      tools: Object.fromEntries(toolList.map((tool) => [tool.name, tool])),
    },
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = request.params.arguments ?? {};
    try {
      const tool = tools.find((t) => t.name === request.params.name);
      if (!tool) {
        throw new Error(`Tool ${request.params.name} not found`);
      }
      const handler = handlers[request.params.name as T[number]["name"]];
      const result = await handler(args);
      const validatedResult = tool.outputSchema.parse(result);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(validatedResult),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: (error as Error).message,
          },
        ],
        isError: true,
      };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, () => ({
    resources: [],
  }));

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: toolList,
  }));

  console.error("MCP server running on stdio");
  return server;
}
