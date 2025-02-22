import { parseArgs } from "node:util";
import { createInMemoryTestClient } from "./lib.ts";
import {
  resolve,
  fromFileUrl,
  join,
  isAbsolute,
  basename,
} from "jsr:@std/path";

async function main() {
  // Find the index of "--" separator
  const separatorIndex = Deno.args.indexOf("--");
  if (separatorIndex === -1) {
    console.error(
      "Usage: lmcp.ts <module_path> [tool_name] -- [tool arguments]"
    );
    console.error(
      "Example: lmcp.ts ./examples/getStringLength.ts -- --input='hello'"
    );
    console.error(
      "Example: lmcp.ts ./examples/getStringLength.ts getStringLength -- --input='hello'"
    );
    Deno.exit(1);
  }

  // Split args into two parts
  const mainArgs = Deno.args.slice(0, separatorIndex);
  const toolRawArgs = Deno.args.slice(separatorIndex + 1);

  // Parse main arguments
  const { positionals } = parseArgs({
    args: mainArgs,
    allowPositionals: true,
  });

  // Validate arguments
  if (positionals.length < 1 || positionals.length > 2) {
    console.error(
      "Usage: lmcp.ts <module_path> [tool_name] -- [tool arguments]"
    );
    console.error(
      "Example: lmcp.ts ./examples/getStringLength.ts -- --input='hello'"
    );
    console.error(
      "Example: lmcp.ts ./examples/getStringLength.ts getStringLength -- --input='hello'"
    );
    Deno.exit(1);
  }

  const [modulePath, explicitToolName] = positionals;
  // If tool name is not provided, use the filename without extension
  const toolName =
    explicitToolName ?? basename(modulePath).replace(/\.[^/.]+$/, "");

  // Parse tool arguments
  const toolArgs: Record<string, unknown> = {};
  for (const arg of toolRawArgs) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      if (value === undefined) {
        toolArgs[key] = true;
      } else {
        try {
          // Try to parse as JSON if possible
          toolArgs[key] = JSON.parse(value);
        } catch {
          // If not valid JSON, use as string
          toolArgs[key] = value.replace(/^['"]|['"]$/g, ""); // Remove quotes if present
        }
      }
    }
  }

  try {
    // Resolve absolute path
    const absolutePath = isAbsolute(modulePath)
      ? modulePath
      : join(Deno.cwd(), modulePath);
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
      // Call tool with specified name
      console.log(`Calling tool "${toolName}" with args:`, toolArgs);
      const result = await client.callTool(toolName, toolArgs);

      // Format output based on content type
      if (result.content && result.content.length > 0) {
        const firstContent = result.content[0];
        if (firstContent.type === "text") {
          // If it's text content, check format and display
          console.log("\nResult:");
          const text = firstContent.text;
          if (text.trim().startsWith("{") && text.trim().endsWith("}")) {
            // If it looks like JSON object, display as-is
            console.log(text);
          } else {
            try {
              // Try to parse and stringify to unescape \n
              console.log(JSON.parse(`"${text.replace(/"/g, '\\"')}"`));
            } catch {
              // If parsing fails, display as-is
              console.log(text);
            }
          }
        } else {
          // For other types, use JSON stringify
          console.log("Result:", JSON.stringify(result, null, 2));
        }
      } else {
        console.log("Result:", JSON.stringify(result, null, 2));
      }
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
