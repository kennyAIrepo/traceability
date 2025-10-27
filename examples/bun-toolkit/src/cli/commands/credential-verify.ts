import { expandPath } from "../../utils/path";
import * as fs from "fs";
import * as yaml from "js-yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import moment from "moment";
import { credentialVerifierFromResolver } from "../../credential/credentialVerifierFromResolver";
import type { VerifyCredentialOptions } from "../cli-utils";

export async function verifyCredential(credentialFile: string, options: VerifyCredentialOptions) {
  console.log(`\n📋 Command: credential verify`);
  console.log(`📄 Credential file: ${credentialFile}\n`);

  // Step 1: Read the credential JWT file
  const credentialPath = expandPath(credentialFile);
  if (!fs.existsSync(credentialPath)) {
    console.error(`\n❌ Credential file not found: ${credentialPath}\n`);
    process.exit(1);
  }

  // Step 1: Read credential file
  console.log(`📝 Reading credential file...`);
  let jwsString: string;
  try {
    jwsString = fs.readFileSync(credentialPath, "utf-8").trim();
    console.log(`   ✓ File loaded`);
  } catch (error) {
    console.error(`\n❌ Failed to read credential file: ${error}\n`);
    process.exit(1);
  }

  // Step 2: Verify the credential (this includes DID resolution and signature validation)
  console.log(`\n🔐 Verifying credential...`);
  let credential: any;
  let signatureValid = false;

  try {
    const verifier = await credentialVerifierFromResolver();
    console.log(`   ✓ Issuer DID resolved`);

    credential = await verifier.verify(jwsString);
    signatureValid = true;
    console.log(`   ✓ Signature validated`);
  } catch (error) {
    console.error(`\n❌ Verification failed: ${error}`);
    if (error instanceof Error && error.stack) {
      console.error(`\nStack trace:\n${error.stack}`);
    }
    console.error();
    process.exit(1);
  }

  // Step 3: Validate against schema if provided
  let schemaValid: boolean | null = null;
  if (options.schema) {
    console.log(`\n📋 Validating schema...`);
    const schemaPath = expandPath(options.schema);

    if (!fs.existsSync(schemaPath)) {
      console.error(`\n❌ Schema file not found: ${schemaPath}\n`);
      process.exit(1);
    }

    try {
      const schemaContent = fs.readFileSync(schemaPath, "utf8");
      const schema = yaml.load(schemaContent) as any;

      // Use strict: false to allow non-standard keywords like "example" which are common in schemas
      const ajv = new Ajv({ allErrors: true, strict: false });
      addFormats(ajv);
      const validate = ajv.compile(schema);

      const valid = validate(credential);

      if (!valid) {
        console.error(`\n❌ Schema validation failed:`);
        validate.errors?.forEach(err => {
          console.error(`   - ${err.instancePath || "root"}: ${err.message}`);
        });
        schemaValid = false;
      } else {
        console.log(`   ✓ Schema valid`);
        schemaValid = true;
      }
    } catch (error) {
      console.error(`\n❌ Schema validation error: ${error}\n`);
      process.exit(1);
    }
  }

  // Step 4: Display verification results
  if (schemaValid === false) {
    console.log(`\n❌ Credential verification failed\n`);
    process.exit(1);
  }

  console.log(`\n✅ Credential verified successfully!\n`);

  console.log(`📊 Verification Details:`);

  // Extract issuer DID - handle both string and object formats
  const issuerDid = typeof credential.issuer === 'string'
    ? credential.issuer
    : credential.issuer.id;
  console.log(`  ✓ Issuer: ${issuerDid}`);

  // Display credential type(s)
  const credentialTypes = Array.isArray(credential.type)
    ? credential.type.filter((t: string) => t !== "VerifiableCredential").join(", ")
    : credential.type;
  console.log(`  ✓ Type: ${credentialTypes}`);

  // Display validity dates
  if (credential.validFrom) {
    const validFromMoment = moment(credential.validFrom);
    console.log(`  ✓ Valid From: ${validFromMoment.fromNow()}`);
  } else if (credential.nbf) {
    const validFromDate = new Date(credential.nbf * 1000);
    const validFromMoment = moment(validFromDate);
    console.log(`  ✓ Valid From: ${validFromMoment.fromNow()}`);
  }

  if (credential.validUntil) {
    const validUntilMoment = moment(credential.validUntil);
    console.log(`  ✓ Valid Until: ${validUntilMoment.fromNow()}`);
  } else if (credential.exp) {
    const validUntilDate = new Date(credential.exp * 1000);
    const validUntilMoment = moment(validUntilDate);
    console.log(`  ✓ Valid Until: ${validUntilMoment.fromNow()}`);
  }

  // Display signature status
  console.log(`  ✓ Signature: ${signatureValid ? "Valid" : "Invalid"}`);

  // Display schema status if validated
  if (schemaValid !== null) {
    console.log(`  ✓ Schema: ${schemaValid ? "Valid" : "Invalid"}`);
  }

  console.log();
}
