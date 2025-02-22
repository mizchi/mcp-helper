import { parseArgs } from "node:util";
import { createInMemoryTestClient } from "./lib.ts";
import {
  resolve,
  fromFileUrl,
} from "https://deno.land/std@0.210.0/path/mod.ts";

async function main() {
  const { positionals, values } = parseArgs({
    args: Deno.args,
    allowPositionals: true,
    options: {
      input: { type: "string" },
      args: { type: "string" },
    },
  });

  // Validate arguments
  if (positionals.length !== 1) {
    console.error(
      "Usage: lmcp.ts <module_path> [--input <value> | --args <json>]"
    );
    console.error(
      "Example: lmcp.ts ./examples/getStringLength.ts --input 'hello'"
    );
    Deno.exit(1);
  }

  const [modulePath] = positionals;
  let toolArgs: Record<string, unknown>;

  // Parse tool arguments
  if (values.args) {
    try {
      toolArgs = JSON.parse(values.args);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Invalid JSON in --args:", error.message);
      } else {
        console.error("Invalid JSON in --args");
      }
      Deno.exit(1);
    }
  } else if (values.input) {
    toolArgs = { input: values.input };
  } else {
    console.error("Either --input or --args must be provided");
    console.error("Example: --input 'hello' or --args '{\"input\":\"hello\"}'");
    Deno.exit(1);
  }

  try {
    // Resolve absolute path
    const currentDir = fromFileUrl(import.meta.url);
    const absolutePath = resolve(currentDir, "..", modulePath);
    console.log(`Loading server from ${absolutePath}`);

    const server = await import(absolutePath).then((m) => m.default);
    if (!server) {
      console.error(
        `Server module found but no default export in ${absolutePath}`
      );
      console.error("\nAdd this code to export the server:\n");
      console.error(`// add for lmcp
if (import.meta.main) {
  await server.connect()
}
export default server;`);
      Deno.exit(1);
    }

    // Create in-memory client
    console.log("Creating in-memory client (cli-test-client)...");
    const client = await createInMemoryTestClient(server);

    try {
      // Call tool with fixed name
      console.log(`Calling tool "getStringLength" with args:`, toolArgs);
      const result = await client.callTool("getStringLength", toolArgs);
      console.log("Result:", JSON.stringify(result, null, 2));
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error calling tool:", error.message);
      } else {
        console.error("Error calling tool");
      }
      Deno.exit(1);
    }

    // Clean up
    await client.close();
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("Module not found")) {
        console.error(`Failed to load module: ${modulePath}`);
      } else {
        console.error("Error:", error.message);
      }
    } else {
      console.error("Error");
    }
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    if (error instanceof Error) {
      console.error("Unhandled error:", error.message);
    } else {
      console.error("Unhandled error");
    }
    Deno.exit(1);
  });
}
