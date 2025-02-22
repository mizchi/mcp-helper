import { parseArgs } from "node:util";
import { createInMemoryTestClient } from "./lib.ts";

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
      "Usage: cli.ts <server_name> [--input <value> | --args <json>]"
    );
    console.error("Example: cli.ts getStringLength --input 'hello'");
    Deno.exit(1);
  }

  const [name] = positionals;
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
    // Import server instance from example
    const serverModule = `./examples/${name}.ts`;
    console.log(`Loading server from ${serverModule}`);

    const server = await import(serverModule).then((m) => m.default);
    if (!server) {
      console.error(
        `Server module found but no default export in ${serverModule}`
      );
      Deno.exit(1);
    }

    // Create in-memory client
    console.log("Creating in-memory client...");
    const client = await createInMemoryTestClient(server);

    try {
      // Call tool
      console.log(`Calling tool "${name}" with args:`, toolArgs);
      const result = await client.callTool(name, toolArgs);
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
        console.error(`Server "${name}" not found in examples/`);
        console.error("Available servers:");
        console.error("  - getStringLength");
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
