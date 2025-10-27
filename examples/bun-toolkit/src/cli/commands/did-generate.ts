import { generatePrivateKey, exportPublicKey } from "../../key";
import { expandPath } from "../../utils/path";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import type { GenerateOptions, Algorithm } from "../cli-utils";

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
    baseDir = expandPath(customKeyPath);
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
