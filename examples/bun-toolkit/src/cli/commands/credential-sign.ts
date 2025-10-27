import { expandPath } from "../../utils/path";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { issueCredential as issueVC } from "../../credential/issuer";
import { loadFromEnv, validateCredentialConfig } from "../../config/env";
import type { SignCredentialOptions } from "../cli-utils";

export async function signCredential(credentialFile: string, options: SignCredentialOptions) {
  console.log(`\n📋 Command: credential sign`);
  console.log(`📄 Credential file: ${credentialFile}\n`);

  // Step 1: Load and validate environment configuration
  console.log(`🔧 Loading configuration...`);
  const config = loadFromEnv();

  // Override with command-line options if provided
  if (options.issuer) {
    config.issuerDid = options.issuer;
  }
  if (options["private-key"]) {
    config.privateKeyPath = expandPath(options["private-key"]);
  }

  const validation = validateCredentialConfig(config);
  if (!validation.valid) {
    console.error(`\n❌ Configuration error - missing required environment variables:`);
    validation.missing.forEach(key => {
      console.error(`   - ${key}`);
    });
    console.error(`\nPlease set these in your .env file or use command-line options.`);
    console.error(`See .env.example for reference.\n`);
    process.exit(1);
  }

  console.log(`   ✓ Configuration loaded`);
  console.log(`   Issuer: ${config.issuerDid}`);

  // Step 2: Read and parse the credential JSON file
  const credentialPath = expandPath(credentialFile);
  if (!fs.existsSync(credentialPath)) {
    console.error(`\n❌ Credential file not found: ${credentialPath}\n`);
    process.exit(1);
  }

  console.log(`\n📖 Reading credential file...`);
  let credential: any;
  try {
    const fileContent = fs.readFileSync(credentialPath, "utf-8");
    credential = JSON.parse(fileContent);
    console.log(`   ✓ File parsed successfully`);
  } catch (error) {
    console.error(`\n❌ Invalid JSON file: ${error}\n`);
    process.exit(1);
  }

  // Step 3: Validate credential structure
  console.log(`\n🔍 Validating credential structure...`);

  // Check for required fields
  if (!credential["@context"]) {
    console.error(`\n❌ Missing required field: @context\n`);
    process.exit(1);
  }
  if (!credential.type) {
    console.error(`\n❌ Missing required field: type\n`);
    process.exit(1);
  }
  if (!credential.credentialSubject) {
    console.error(`\n❌ Missing required field: credentialSubject\n`);
    process.exit(1);
  }

  console.log(`   ✓ Credential structure valid`);

  // Extract credential types
  const credentialTypes = Array.isArray(credential.type)
    ? credential.type
    : [credential.type];
  console.log(`   Credential types: ${credentialTypes.join(", ")}`);

  // Step 4: Sign the credential
  console.log(`\n🔐 Signing credential...`);

  // Use the provided issuer or keep the existing one
  const issuerDid = credential.issuer || config.issuerDid!;
  const credentialSubject = credential.credentialSubject;

  const credentialJWT = await issueVC(
    issuerDid,
    config.privateKeyPath!,
    credentialTypes,
    credentialSubject,
    {
      validFrom: credential.validFrom,
      validUntil: credential.validUntil,
    }
  );
  console.log(`   ✓ Credential signed`);

  // Step 5: Save the signed credential
  console.log(`\n💾 Saving output...`);

  // Determine storage path
  let outputDir: string;
  if (options["output-path"]) {
    outputDir = expandPath(options["output-path"]);
  } else {
    const homeDir = os.homedir();
    const downloadsDir = path.join(homeDir, "Downloads");

    if (fs.existsSync(downloadsDir)) {
      outputDir = path.join(downloadsDir, "vc-cli", "credentials");
    } else {
      outputDir = path.join(homeDir, "vc-cli", "credentials");
    }
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate output filename
  const baseName = path.basename(credentialPath, path.extname(credentialPath));
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const outputFileName = `${baseName}-signed-${timestamp}.vc.jwt.txt`;
  const outputPath = path.join(outputDir, outputFileName);

  // Save signed credential
  await Bun.write(outputPath, credentialJWT);
  console.log(`   ✓ Signed credential: ${outputPath}`);

  console.log(`\n✅ Credential signing complete!\n`);
}
