import * as fs from "fs";
import type { VerifiableCredential } from "./credential";
import { signer } from "./signer";
import type { PrivateKey } from "../types";

export interface IssueOptions {
  validFrom?: string;
  validUntil?: string;
}

/**
 * Issue a verifiable credential from extracted document data
 * @param issuerDid The DID of the credential issuer
 * @param privateKeyPath Path to the private key file
 * @param credentialTypes Array of credential types (e.g., ["VerifiableCredential", "MetallurgicalCertificationCredential"])
 * @param credentialSubjectData The extracted data to include in credentialSubject
 * @param options Optional parameters (validFrom, validUntil)
 * @returns Signed verifiable credential as an enveloped JWT string
 */
export async function issueCredential(
  issuerDid: string,
  privateKeyPath: string,
  credentialTypes: string[],
  credentialSubjectData: Record<string, unknown>,
  options: IssueOptions = {}
): Promise<string> {
  // Load private key
  const privateKeyContent = fs.readFileSync(privateKeyPath, "utf-8");
  const privateKeys = JSON.parse(privateKeyContent);

  // Use assertion key for signing credentials
  const assertionKey = privateKeys.assertion as PrivateKey;

  if (!assertionKey) {
    throw new Error("Assertion key not found in private key file");
  }

  // Build the verifiable credential
  const credential: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: credentialTypes,
    issuer: issuerDid,
    credentialSubject: credentialSubjectData,
  };

  // Add optional validity dates
  if (options.validFrom) {
    credential.validFrom = options.validFrom;
  }
  if (options.validUntil) {
    credential.validUntil = options.validUntil;
  }

  // Sign the credential
  const credentialSigner = await signer(assertionKey);
  const jws = await credentialSigner.sign(credential, {
    kid: `${issuerDid}#${assertionKey.kid}`,
  });

  return jws;
}
