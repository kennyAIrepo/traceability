/**
 * Shared CLI utilities, types, and helper functions
 */

export interface GenerateOptions {
  lei?: string;
  algorithm?: string;
  "output-path"?: string;
}

export interface VerifyOptions {
  "show-document"?: boolean;
}

export interface IssueCredentialOptions {
  issuer?: string;
  "private-key"?: string;
  "output-path"?: string;
  "valid-from"?: string;
  "valid-until"?: string;
}

export interface SignCredentialOptions {
  issuer?: string;
  "private-key"?: string;
  "output-path"?: string;
}

export interface VerifyCredentialOptions {
  schema?: string;
}

export interface CreatePresentationOptions {
  holder?: string;
  "private-key"?: string;
  "output-path"?: string;
  "expires-in"?: string;
}

export type Algorithm = "ES256" | "ES384";

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
  credential issue <path> [options]             Issue a verifiable credential from a document or file
                                                Supports PDF, images, JSON, CSV, YAML
  credential sign <path> [options]              Sign a credential JSON file
  credential verify <path> [options]            Verify a signed credential file
  presentation create <path> [...] [opts]       Create a verifiable presentation from credentials
                                                Supports multiple paths
                                                Path can be a credential file or directory
                                                Credential files must end in .vc.jwt.txt
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

Options for 'credential issue':
  --issuer <did>                                Override issuer DID (default: from env)
  --private-key <path>                          Override private key path (default: from env)
  --output-path <path>                          Output directory (default: ~/Downloads/vc-cli/ or ~/vc-cli/)
  --valid-from <date>                           Credential validity start (default: current timestamp)
  --valid-until <date>                          Credential validity end (default: no expiration)

Options for 'credential sign':
  --issuer <did>                                Override issuer DID (default: from env)
  --private-key <path>                          Override private key path (default: from env)
  --output-path <path>                          Output directory (default: ~/Downloads/vc-cli/ or ~/vc-cli/)

Options for 'credential verify':
  --schema <path>                               Optional schema file to validate against

Options for 'presentation create':
  --holder <did>                                Override holder DID (default: from env)
  --private-key <path>                          Override private key path (default: from env)
  --output-path <path>                          Output directory (default: ~/Downloads/vc-cli/presentations)
  --expires-in <seconds>                        Presentation expiration in seconds (default: 3600)
`);
}
