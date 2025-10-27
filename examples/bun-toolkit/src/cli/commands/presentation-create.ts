import { expandPath } from "../../utils/path";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { loadFromEnv } from "../../config/env";
import { signer } from "../../presentation/signer";
import { createEnvelopedVerifiableCredential } from "../../credential/credential";
import { credentialVerifierFromResolver } from "../../credential/credentialVerifierFromResolver";
import type { VerifiablePresentation } from "../../presentation/presentation";
import type { CreatePresentationOptions } from "../cli-utils";

export async function createPresentation(credentialFiles: string[], options: CreatePresentationOptions) {
  console.log(`\n📋 Command: presentation create`);
  console.log(`📄 Credential paths: ${credentialFiles.length}\n`);

  // Step 1: Load and validate environment configuration
  console.log(`🔧 Loading configuration...`);
  const config = loadFromEnv();

  // Override with command-line options if provided
  const holderDid = options.holder || config.issuerDid;
  const privateKeyPath = options["private-key"]
    ? expandPath(options["private-key"])
    : config.privateKeyPath;

  if (!holderDid) {
    console.error(`\n❌ Configuration error - holder DID not specified.`);
    console.error(`Please set VC_CLI_ISSUER_DID in .env or use --holder flag.\n`);
    process.exit(1);
  }

  if (!privateKeyPath) {
    console.error(`\n❌ Configuration error - private key path not specified.`);
    console.error(`Please set VC_CLI_PRIVATE_KEY_PATH in .env or use --private-key flag.\n`);
    process.exit(1);
  }

  console.log(`   ✓ Configuration loaded`);
  console.log(`   Holder: ${holderDid}`);

  // Step 2: Load private key
  if (!fs.existsSync(privateKeyPath)) {
    console.error(`\n❌ Private key file not found: ${privateKeyPath}\n`);
    process.exit(1);
  }

  const privateKeyContent = fs.readFileSync(privateKeyPath, "utf-8");
  const privateKeys = JSON.parse(privateKeyContent);

  // Use authentication key for presentations (not assertion key)
  const authenticationKey = privateKeys.authentication;
  if (!authenticationKey) {
    console.error(`\n❌ Authentication key not found in private key file.\n`);
    process.exit(1);
  }

  // Step 3: Load and validate credential files (supports files and directories)
  console.log(`\n📝 Loading credentials...`);
  const credentialJWTs: string[] = [];
  const allCredentialPaths: string[] = [];

  // Process each argument - could be a file or directory
  for (const credentialFileOrDir of credentialFiles) {
    const inputPath = expandPath(credentialFileOrDir);

    if (!fs.existsSync(inputPath)) {
      console.error(`\n❌ Path not found: ${inputPath}\n`);
      process.exit(1);
    }

    const stats = fs.statSync(inputPath);

    if (stats.isDirectory()) {
      // Scan directory for .vc.jwt.txt files (non-recursive)
      const files = fs.readdirSync(inputPath);
      const vcFiles = files
        .filter(f => f.endsWith('.vc.jwt.txt'))
        .map(f => path.join(inputPath, f));

      if (vcFiles.length === 0) {
        console.error(`\n❌ No credential files (*.vc.jwt.txt) found in directory: ${inputPath}\n`);
        process.exit(1);
      }

      console.log(`   ✓ Found ${vcFiles.length} credential(s) in ${path.basename(inputPath)}`);
      allCredentialPaths.push(...vcFiles);
    } else {
      // It's a file
      allCredentialPaths.push(inputPath);
    }
  }

  // Now load all the credentials
  for (const credentialPath of allCredentialPaths) {
    try {
      const credentialJWT = fs.readFileSync(credentialPath, "utf-8").trim();
      credentialJWTs.push(credentialJWT);
      console.log(`   ✓ Loaded: ${path.basename(credentialPath)}`);
    } catch (error) {
      console.error(`\n❌ Failed to read credential file: ${credentialPath}\n`);
      console.error(`   Error: ${error}\n`);
      process.exit(1);
    }
  }

  // Step 4: Validate credentials before packaging
  console.log(`\n🔐 Validating credentials...`);
  const verifier = await credentialVerifierFromResolver();
  const validatedCredentials: any[] = [];

  for (let i = 0; i < credentialJWTs.length; i++) {
    const credentialJWT = credentialJWTs[i];
    const credentialPath = allCredentialPaths[i];

    if (!credentialJWT || !credentialPath) {
      console.error(`\n❌ Missing credential data at index ${i}\n`);
      process.exit(1);
    }

    try {
      // Verify signature and DID resolution
      const credential = await verifier.verify(credentialJWT);

      // Check expiration date
      if (credential.exp) {
        const expirationDate = new Date(credential.exp * 1000);
        const now = new Date();

        if (expirationDate < now) {
          console.error(`\n❌ Credential expired: ${path.basename(credentialPath)}`);
          console.error(`   Expired on: ${expirationDate.toISOString()}\n`);
          process.exit(1);
        }
      }

      // Check validity start date
      if (credential.nbf) {
        const validFromDate = new Date(credential.nbf * 1000);
        const now = new Date();

        if (validFromDate > now) {
          console.error(`\n❌ Credential not yet valid: ${path.basename(credentialPath)}`);
          console.error(`   Valid from: ${validFromDate.toISOString()}\n`);
          process.exit(1);
        }
      }

      validatedCredentials.push(credential);
      console.log(`   ✓ Valid: ${path.basename(credentialPath)}`);
    } catch (error) {
      console.error(`\n❌ Credential verification failed: ${path.basename(credentialPath)}`);
      console.error(`   Error: ${error}\n`);
      process.exit(1);
    }
  }

  // Step 5: Create enveloped credentials
  console.log(`\n📦 Creating enveloped credentials...`);
  const envelopedCredentials = credentialJWTs.map(jwt => createEnvelopedVerifiableCredential(jwt));
  console.log(`   ✓ Created ${envelopedCredentials.length} enveloped credential(s)`);

  // Step 6: Create presentation
  console.log(`\n🎭 Creating verifiable presentation...`);
  const presentation: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: holderDid,
    verifiableCredential: envelopedCredentials
  };

  // Step 7: Sign the presentation
  console.log(`\n🔐 Signing presentation...`);
  const presentationSigner = await signer(authenticationKey);

  // Build signing options
  const signingOptions: any = {
    kid: authenticationKey.kid
  };

  // Handle expires-in option
  if (options["expires-in"]) {
    const expiresIn = parseInt(options["expires-in"]);
    const now = Math.floor(Date.now() / 1000);
    signingOptions.iat = now;
    signingOptions.exp = now + expiresIn;
  }

  const signedPresentation = await presentationSigner.sign(presentation, signingOptions);
  console.log(`   ✓ Presentation signed`);

  // Step 8: Save the signed presentation
  console.log(`\n💾 Saving presentation...`);

  // Determine storage path
  let outputDir: string;
  if (options["output-path"]) {
    outputDir = expandPath(options["output-path"]);
  } else {
    const homeDir = os.homedir();
    const downloadsDir = path.join(homeDir, "Downloads");

    // Check if Downloads directory exists
    if (fs.existsSync(downloadsDir)) {
      outputDir = path.join(downloadsDir, "vc-cli", "presentations");
    } else {
      outputDir = path.join(homeDir, "vc-cli", "presentations");
    }
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const outputFileName = `presentation-${timestamp}.vp.jwt.txt`;
  const outputPath = path.join(outputDir, outputFileName);

  await Bun.write(outputPath, signedPresentation);
  console.log(`   ✓ Presentation: ${outputPath}`);

  console.log(`\n✅ Presentation creation complete!\n`);
}
