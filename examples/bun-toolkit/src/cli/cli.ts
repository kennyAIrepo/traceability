#!/usr/bin/env bun

import { parseArgs } from "util";
import { printVersion, printHelp } from "./cli-utils";
import { generateDid } from "./commands/did-generate";
import { verifyDid } from "./commands/did-verify";
import { issueCredential } from "./commands/credential-issue";
import { signCredential } from "./commands/credential-sign";
import { verifyCredential } from "./commands/credential-verify";
import { createPresentation } from "./commands/presentation-create";

try {
  const { positionals, values } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    options: {
      lei: { type: "string" },
      algorithm: { type: "string" },
      "output-path": { type: "string" },
      "show-document": { type: "boolean" },
      issuer: { type: "string" },
      "private-key": { type: "string" },
      "valid-from": { type: "string" },
      "valid-until": { type: "string" },
      schema: { type: "string" },
      holder: { type: "string" },
      "expires-in": { type: "string" }
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

    case "credential":
      if (subcommand === "issue") {
        if (!argument) {
          console.error("Error: document file argument is required");
          console.log("Usage: vc-cli credential issue <document-file>");
          process.exit(1);
        }
        await issueCredential(argument, values);
      } else if (subcommand === "sign") {
        if (!argument) {
          console.error("Error: credential file argument is required");
          console.log("Usage: vc-cli credential sign <credential.json>");
          process.exit(1);
        }
        await signCredential(argument, values);
      } else if (subcommand === "verify") {
        if (!argument) {
          console.error("Error: credential file argument is required");
          console.log("Usage: vc-cli credential verify <credential.jwt>");
          process.exit(1);
        }
        await verifyCredential(argument, values);
      } else {
        console.error(`Unknown credential subcommand: ${subcommand}`);
        printHelp();
        process.exit(1);
      }
      break;

    case "presentation":
      if (subcommand === "create") {
        // Get all paths (files or directories) from positionals starting at index 2
        const credentialPaths = positionals.slice(2);
        if (credentialPaths.length === 0) {
          console.error("Error: at least one path (file or directory) is required");
          console.log("Usage: vc-cli presentation create <path> [path2 ...]");
          console.log("       Path can be a credential file or directory containing credentials");
          process.exit(1);
        }
        await createPresentation(credentialPaths, values);
      } else {
        console.error(`Unknown presentation subcommand: ${subcommand}`);
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
