import type { VerifiableCredential } from "./credential";
import type { GenericResolver } from "../resolver/genericResolver";
import * as jws from "../encoding/jws";
import { defaultGenericResolver } from "../resolver/genericResolver";
import { validateCredentialSchemas } from "../verification/utils";

export interface CredentialVerifierFromResolver {
  verify: (jwsString: string, options?: { validateSchema?: boolean }) => Promise<VerifiableCredential>;
}

export const credentialVerifierFromResolver = async (
  resolver: GenericResolver = defaultGenericResolver
) => {
  return {
    verify: async (jwsString: string, options?: { validateSchema?: boolean }) => {
      // Parse JWS using the shared utility
      const parsed = jws.parseJWS(jwsString);
      const { header, payload: credential } = parsed;

      // Get the issuer from the credential
      if (!credential.issuer) {
        throw new Error('Credential must have an issuer');
      }

      // Extract issuer DID - handle both string and object formats
      const issuerDid = typeof credential.issuer === 'string'
        ? credential.issuer
        : credential.issuer.id;

      if (!issuerDid) {
        throw new Error('Credential issuer must have an id');
      }

      const assertionKeyId = header.kid;

      if (!assertionKeyId.startsWith(issuerDid)) {
        throw new Error(`Credential issuer ${issuerDid} does not match assertion key ${assertionKeyId}`);
      }

      // Resolve the issuer's controller document
      const issuer = await resolver.resolveController(assertionKeyId);

      // Resolve the credential verifier using the kid
      const credentialVerifier = await issuer.assertion.resolve(assertionKeyId);

      // Verify the credential signature
      const verifiedCredential = await credentialVerifier.verify(jwsString);

      // If validateSchema option is true, validate credential schemas
      if (options?.validateSchema) {
        await validateCredentialSchemas(verifiedCredential, resolver);
      }

      return verifiedCredential;
    }
  };
};