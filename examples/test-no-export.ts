import { createToolsServer } from "jsr:@mizchi/mcp-helper";
import { z } from "npm:zod";

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

// Missing export default server
