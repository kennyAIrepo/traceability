import { generatePrivateKey, exportPublicKey } from "../key";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import * as yaml from "js-yaml";

export interface GenerateOptions {
  lei?: string;
  algorithm?: string;
  "output-path"?: string;
}

export interface VerifyOptions {
  "show-document"?: boolean;
}

export type Algorithm = "ES256" | "ES384";

interface DidDocument {
  "@context": string[];
  id: string;
  verificationMethod: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyJwk: {
      kty: string;
      crv: string;
      alg: string;
      x: string;
      y: string;
    };
  }>;
  assertionMethod: string[];
  authentication: string[];
  alsoKnownAs?: string[];
}

export function printVersion() {
  console.log("Verifiable Supply Chain Toolkit v0.1.0");
}

export function printHelp() {
  console.log(`
Verifiable Supply Chain CLI

Usage: vc-cli <command> [options]

Commands:
  did generate <domain> [options]               Generate a new did:web identifier
                                                Domain can include optional path
                                                Examples: contoso.com
                                                          contoso.com/organizations/contoso
  did verify <did> [options]                    Verify a did:web is properly hosted
  version                                       Show version information
  help                                          Show this help message

Options for 'did generate':
  --lei <lei>                                   Legal Entity Identifier (optional)
  --algorithm <alg>                             Cryptographic algorithm (default: ES256)
                                                Available: ES256, ES384
  --output-path <path>                          Custom output path for generated files
                                                (default: ~/Downloads/vc-cli/ or ~/vc-cli/)

Options for 'did verify':
  --show-document                               Display the full DID document (optional)
`);
}

export async function generateDid(domainInput: string, options: GenerateOptions) {
  console.log(`\n📋 Command: did generate`);
  console.log(`📍 Input: ${domainInput}`);

  // Parse domain and path - convert slashes to colons for DID format
  // contoso.com/organizations/123 -> domain: contoso.com, path: organizations:123
  const parts = domainInput.split("/");
  const domain = parts[0];
  const pathParts = parts.slice(1).filter(p => p.length > 0);
  const didPath = pathParts.length > 0 ? `:${pathParts.join(":")}` : "";

  if (pathParts.length > 0) {
    console.log(`📍 Domain: ${domain}`);
    console.log(`📁 Path: /${pathParts.join("/")}`);
  }

  // Parse options
  const algorithm = (options.algorithm || "ES256").toUpperCase() as Algorithm;
  const lei = options.lei;
  const customKeyPath = options["output-path"];

  // Validate algorithm
  if (algorithm !== "ES256" && algorithm !== "ES384") {
    console.error(`\n❌ Error: Unsupported algorithm "${algorithm}"`);
    console.error(`   Available algorithms: ES256, ES384`);
    process.exit(1);
  }

  console.log(`\n🔑 Generating cryptographic keys (${algorithm})...`);

  // Generate assertion key (for issuing credentials)
  const assertionPrivateKey = await generatePrivateKey(algorithm);
  const assertionPublicKey = await exportPublicKey(assertionPrivateKey);

  console.log(`   ✓ Assertion key generated`);
  console.log(`     Kid: ${assertionPrivateKey.kid}`);

  // Generate authentication key (for presenting credentials)
  const authenticationPrivateKey = await generatePrivateKey(algorithm);
  const authenticationPublicKey = await exportPublicKey(authenticationPrivateKey);

  console.log(`   ✓ Authentication key generated`);
  console.log(`     Kid: ${authenticationPrivateKey.kid}`);

  console.log(`\n📄 Building DID document...`);

  // Build the DID document (W3C DID standard format)
  const didId = `did:web:${domain}${didPath}`;

  const didDocument: DidDocument = {
    "@context": [
      "https://www.w3.org/ns/cid/v1",
    ],
    id: didId,
    verificationMethod: [
      {
        id: `${didId}#${assertionPublicKey.kid}`,
        type: "JsonWebKey",
        controller: didId,
        publicKeyJwk: {
          kty: assertionPublicKey.kty,
          crv: assertionPublicKey.crv,
          alg: assertionPublicKey.alg,
          x: assertionPublicKey.x,
          y: assertionPublicKey.y
        }
      },
      {
        id: `${didId}#${authenticationPublicKey.kid}`,
        type: "JsonWebKey",
        controller: didId,
        publicKeyJwk: {
          kty: authenticationPublicKey.kty,
          crv: authenticationPublicKey.crv,
          alg: authenticationPublicKey.alg,
          x: authenticationPublicKey.x,
          y: authenticationPublicKey.y
        }
      }
    ],
    assertionMethod: [
      `${didId}#${assertionPublicKey.kid}`
    ],
    authentication: [
      `${didId}#${authenticationPublicKey.kid}`
    ]
  };

  // Add LEI if provided
  if (lei) {
    didDocument.alsoKnownAs = [`urn:ietf:spice:glue:lei:${lei}`];
  }

  console.log(`   ✓ DID document created`);

  console.log(`\n💾 Saving files...`);

  // Determine storage path - use Downloads if it exists, otherwise home directory
  let baseDir: string;
  if (customKeyPath) {
    baseDir = customKeyPath;
  } else {
    const homeDir = os.homedir();
    const downloadsDir = path.join(homeDir, "Downloads");

    // Check if Downloads directory exists (common on macOS, Windows, Linux desktops)
    if (fs.existsSync(downloadsDir)) {
      baseDir = path.join(downloadsDir, "vc-cli");
    } else {
      // Fallback to home directory if Downloads doesn't exist (e.g., Linux servers)
      baseDir = path.join(homeDir, "vc-cli");
    }
  }

  // Create safe directory name by replacing special characters
  const safeDidName = `did-web-${domain}${didPath}`.replace(/:/g, "-");
  const keyPath = path.join(baseDir, safeDidName);

  // Create directory
  if (!fs.existsSync(keyPath)) {
    fs.mkdirSync(keyPath, { recursive: true });
  }

  // Save DID document
  const didDocPath = path.join(keyPath, "did.json");
  await Bun.write(didDocPath, JSON.stringify(didDocument, null, 2));
  console.log(`   ✓ DID document saved: ${didDocPath}`);

  // Save private keys
  const privateKeyPath = path.join(keyPath, "private-key.json");
  const privateKeys = {
    assertion: assertionPrivateKey,
    authentication: authenticationPrivateKey
  };
  await Bun.write(privateKeyPath, JSON.stringify(privateKeys, null, 2));
  console.log(`   ✓ Private keys saved: ${privateKeyPath}`);

  // Save public keys
  const publicKeyPath = path.join(keyPath, "public-key.json");
  const publicKeys = {
    assertion: assertionPublicKey,
    authentication: authenticationPublicKey
  };
  await Bun.write(publicKeyPath, JSON.stringify(publicKeys, null, 2));
  console.log(`   ✓ Public keys saved: ${publicKeyPath}`);

  console.log(`\n📋 DID Document:`);
  console.log(JSON.stringify(didDocument, null, 2));

  console.log(`\n✅ Files saved successfully!\n`);
  console.log(`Keys stored at:`);
  console.log(`  ${keyPath}\n`);
}

export async function verifyDid(did: string, options: VerifyOptions) {
  console.log(`\n📋 Command: did verify`);
  console.log(`🔍 DID: ${did}\n`);

  const showDocument = options["show-document"] || false;

  // Parse the DID
  if (!did.startsWith("did:web:")) {
    console.error("❌ Error: Invalid DID format. Expected format: did:web:<domain>[:<optional:path>]");
    process.exit(1);
  }

  // Parse did:web according to the spec
  // did:web:contoso.com -> https://contoso.com/.well-known/did.json
  // did:web:contoso.com:user:alice -> https://contoso.com/user/alice/did.json
  const didParts = did.replace("did:web:", "").split(":");
  const domain = didParts[0];
  const pathParts = didParts.slice(1);

  let url: string;
  if (pathParts.length > 0) {
    // Has path components - construct URL with path
    const path = pathParts.join("/");
    url = `https://${domain}/${path}/did.json`;
  } else {
    // No path components - use .well-known
    url = `https://${domain}/.well-known/did.json`;
  }

  console.log(`📍 Domain: ${domain}`);
  if (pathParts.length > 0) {
    console.log(`📁 Path: /${pathParts.join("/")}`);
  }
  console.log(`🌐 Fetching: ${url}\n`);

  try {
    // Fetch the DID document
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`❌ Failed to fetch DID document: ${response.status} ${response.statusText}`);
      process.exit(1);
    }

    console.log(`✅ HTTP ${response.status} - DID document found`);

    // Parse JSON
    let didDocument: any;
    try {
      didDocument = await response.json();
      console.log(`✅ Valid JSON structure`);
    } catch (jsonError) {
      console.error(`\n❌ Invalid JSON: ${jsonError}`);
      process.exit(1);
    }

    // Validate against DID document schema
    const schemaPath = path.resolve(__dirname, "../../schemas/did-document.yaml");
    const schemaContent = fs.readFileSync(schemaPath, "utf8");
    const schema = yaml.load(schemaContent) as any;

    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);

    const valid = validate(didDocument);

    if (!valid) {
      console.error(`\n❌ Invalid DID document structure:`);
      validate.errors?.forEach(err => {
        console.error(`   - ${err.instancePath || "root"}: ${err.message}`);
      });
      process.exit(1);
    }

    console.log(`✅ Valid DID document structure`);
    console.log(`   - ID: ${didDocument.id}`);
    if (didDocument.verificationMethod) {
      console.log(`   - Verification methods: ${didDocument.verificationMethod.length}`);
    }
    if (didDocument.alsoKnownAs) {
      console.log(`   - Also known as: ${didDocument.alsoKnownAs.length} identifier(s)`);
    }

    console.log(`\n✅ DID verification successful!`);

    if (showDocument) {
      console.log(`\nDID Document:`);
      console.log(JSON.stringify(didDocument, null, 2));
    }
    console.log();

  } catch (error) {
    console.error(`\n❌ Error verifying DID: ${error}`);
    process.exit(1);
  }
}
