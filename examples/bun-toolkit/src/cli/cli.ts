#!/usr/bin/env bun

import { parseArgs } from "util";
import { printVersion, printHelp, generateDid, verifyDid } from "./cli-utils";

try {
  const { positionals, values } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    options: {
      lei: { type: "string" },
      algorithm: { type: "string" },
      "output-path": { type: "string" },
      "show-document": { type: "boolean" }
    }
  });

  const command = positionals[0];
  const subcommand = positionals[1];
  const argument = positionals[2];

  if (!command || command === "help") {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case "version":
      printVersion();
      break;

    case "did":
      if (subcommand === "generate") {
        if (!argument) {
          console.error("Error: domain argument is required");
          console.log("Usage: vc-cli did generate <domain>");
          process.exit(1);
        }
        await generateDid(argument, values);
      } else if (subcommand === "verify") {
        if (!argument) {
          console.error("Error: DID argument is required");
          console.log("Usage: vc-cli did verify <did>");
          process.exit(1);
        }
        await verifyDid(argument, values);
      } else {
        console.error(`Unknown did subcommand: ${subcommand}`);
        printHelp();
        process.exit(1);
      }
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
} catch (error) {
  console.error(`Error: ${error}`);
  process.exit(1);
}
