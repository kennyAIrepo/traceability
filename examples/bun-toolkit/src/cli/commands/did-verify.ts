import * as path from "path";
import * as fs from "fs";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import * as yaml from "js-yaml";
import type { VerifyOptions } from "../cli-utils";

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
    const schemaPath = path.resolve(__dirname, "../../../schemas/did-document.yaml");
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
