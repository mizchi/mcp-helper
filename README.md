# @mizchi/mcp-helper

A type-safe helper library for creating Model Context Protocol (MCP) servers in Deno.

## Features

- Type-safe MCP server creation with TypeScript
- Zod schema validation for input/output
- In-memory test client for easy testing
- Built-in TypeScript type inference for tools

## Installation

```ts
import { createToolsServer } from "jsr:@mizchi/mcp-helper";
```

## Usage

### Creating an MCP Server

```ts
import { createToolsServer } from "jsr:@mizchi/mcp-helper";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk@1.5.0/server/stdio.js";
import { z } from "zod";

// Define your tools with Zod schemas
const tools = [
  {
    name: "getStringLength",
    description: "Get length of input string",
    inputSchema: z.object({
      input: z.string().describe("The input string"),
    }),
    outputSchema: z.number(),
  },
] as const;

// Create the server with type-safe handlers
const server = createToolsServer(
  {
    name: "my-server",
    version: "1.0.0",
  },
  tools,
  // define handlers for all tools
  {
    getStringLength(params: { input: string }) {
      return params.input.length;
    },
  }
);
await server.connect(new StdioServerTransport());
```

### Testing Your Server

The library provides an in-memory test client for easy testing:

```ts
import { createInMemoryTestClient } from "@mizchi/mcp-helper";

// Create a test client
const client = await createInMemoryTestClient<typeof tools>(server);

// Call tools with type safety
const result = await client.callTool("getStringLength", {
  input: "Hello, world!",
});

console.log(result); // 13

// Clean up
await client.close();
```

### MCP Configuration

Add your server to the MCP configuration:

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
```

## API

### `createToolsServer<T extends Tools>(info, tools, handlers)`

Creates a new MCP server with type-safe tool definitions.

- `info`: Server information (name and version)
- `tools`: Array of tool definitions with Zod schemas
- `handlers`: Implementation of tool handlers

### `createInMemoryTestClient<T extends Tools>(server)`

Creates a test client for the given server.

- `server`: The MCP server instance
- Returns: A type-safe client for testing tools

## CLI

NOTION: you can not install cli via jsr for dynamic import restrictions.

Add this export for your server impl.

```ts
// add this export for impl
export default server;
```

```bash
# clone this repo and cd 
# run local
$ deno run -A ./lmcp.ts -A examples/getStringLength.ts --input hello

# Install cli
$ deno install -Afg ./lmcp.ts -A
$ lmcp examples/getStringLength.ts --input hello
```

## Development

```bash
# Run tests
deno task test
```

## License

MIT
