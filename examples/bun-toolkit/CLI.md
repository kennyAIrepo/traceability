# VC-CLI: DID Document Generator

A command-line tool for generating `did:web` identifiers with cryptographic keys for verifiable credentials.

## Prerequisites

-   [Bun](https://bun.sh) installed on your system
-   This repository cloned locally

## Quick Start

Navigate to the toolkit directory:

```bash
cd examples/bun-toolkit
```

Generate a DID document for your domain:

```bash
bun vc-cli did generate contoso.com
```

This will:

-   Generate two cryptographic key pairs (ES256 by default)
-   Create a W3C-compliant DID document
-   Save files to `~/Downloads/vc-cli/did-web-contoso.com/`

## Usage

### Basic Command

```bash
bun vc-cli did generate <domain>[/path]
```

**Examples:**

Generate a DID for a domain:

```bash
bun vc-cli did generate contoso.com
```

Generate a DID with a path:

```bash
bun vc-cli did generate contoso.com/organizations/contoso
```

**Path Handling:**

The CLI automatically converts forward slashes (`/`) to colons (`:`) for the DID identifier format:

| Input                               | DID Identifier                              | Host Location                                        |
| ----------------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| `contoso.com`                       | `did:web:contoso.com`                       | `https://contoso.com/.well-known/did.json`           |
| `contoso.com/organizations/contoso` | `did:web:contoso.com:organizations:contoso` | `https://contoso.com/organizations/contoso/did.json` |

### With Options

Add a Legal Entity Identifier (LEI):

```bash
bun vc-cli did generate contoso.com --lei 506700GE1G29325QX363
```

Use ES384 algorithm instead of ES256:

```bash
bun vc-cli did generate contoso.com --algorithm ES384
```

Specify a custom output directory:

```bash
bun vc-cli did generate contoso.com --output-path ~/Documents/did
```

Combine multiple options:

```bash
bun vc-cli did generate contoso.com --lei 506700GE1G29325QX363 --algorithm ES384 --output-path ~/Documents/did
```

### Verifying a DID

Verify that a DID is properly hosted and accessible:

```bash
bun vc-cli did verify <did> [options]
```

**Examples:**

Verify a simple domain DID:

```bash
bun vc-cli did verify did:web:contoso.com
```

Verify a DID with a path:

```bash
bun vc-cli did verify did:web:contoso.com:organizations:contoso
```

Display the full DID document:

```bash
bun vc-cli did verify did:web:contoso.com --show-document
```

**What the verify command checks:**

1. ✅ **Fetches the DID document** from the appropriate URL
2. ✅ **Validates JSON structure** - Ensures the response is valid JSON
3. ✅ **Validates DID document schema** - Checks against W3C DID Core 1.0 specification
4. ✅ **Displays verification results** - Shows validation details and optionally the full DID document

The verify command automatically handles path conversion:

-   `did:web:contoso.com` → Fetches from `https://contoso.com/.well-known/did.json`
-   `did:web:contoso.com:organizations:contoso` → Fetches from `https://contoso.com/organizations/contoso/did.json`

**Verify Options:**

| Option            | Description                   |
| ----------------- | ----------------------------- |
| `--show-document` | Display the full DID document |

## Options

| Option                 | Description                            | Default                              |
| ---------------------- | -------------------------------------- | ------------------------------------ |
| `--lei <lei>`          | Legal Entity Identifier                | None                                 |
| `--algorithm <alg>`    | Cryptographic algorithm (ES256, ES384) | ES256                                |
| `--output-path <path>` | Custom output path for generated files | `~/Downloads/vc-cli/` or `~/vc-cli/` |

## Output Files

The CLI generates three files in `<output-path>/did-web-<domain>/`:

1. **did.json** - Your DID document (public, host this on your domain)
2. **private-key.json** - Private keys (keep secure, never commit to git)
3. **public-key.json** - Public keys (for reference)

### Example Output Structure

```
~/Downloads/vc-cli/did-web-contoso.com/
├── did.json
├── private-key.json
└── public-key.json
```

## Hosting Your DID Document

According to the [did:web specification](https://w3c-ccg.github.io/did-method-web/), you must host your `did.json` file at specific locations based on your DID identifier:

### For domain-only DIDs

**DID identifier:** `did:web:contoso.com`

**Host location:** `https://contoso.com/.well-known/did.json`

### For path-based DIDs

**DID identifier:** `did:web:contoso.com:organizations:contoso`

**Host location:** `https://contoso.com/organizations/contoso/did.json`

### Example nginx configuration:

```nginx
# For domain-only DID (did:web:contoso.com)
location /.well-known/did.json {
    alias /path/to/did.json;
    add_header Content-Type application/json;
    add_header Access-Control-Allow-Origin *;
}

# For path-based DID (did:web:contoso.com:organizations:contoso)
location /organizations/contoso/did.json {
    alias /path/to/organizations/contoso/did.json;
    add_header Content-Type application/json;
    add_header Access-Control-Allow-Origin *;
}
```

### Verification

Test that your DID is accessible:

```bash
# For domain-only DID
curl https://contoso.com/.well-known/did.json

# For path-based DID
curl https://contoso.com/organizations/contoso/did.json
```

## Security Notes

⚠️ **Important:**

-   **Never commit `private-key.json` to version control**
-   Add `**/private-key.json` to your `.gitignore`
-   Store private keys securely (consider using a secrets manager)
-   The `did.json` file is public and should be hosted on your domain
-   Private keys are never logged to the console

## Key Types

The CLI generates two separate keys:

-   **Assertion Key** - Used for issuing verifiable credentials
-   **Authentication Key** - Used for presenting verifiable credentials

This separation follows security best practices for verifiable credentials.

## Supported Algorithms

| Algorithm | Curve | Hash    | Use Case                     |
| --------- | ----- | ------- | ---------------------------- |
| ES256     | P-256 | SHA-256 | Default, widely supported    |
| ES384     | P-384 | SHA-384 | Higher security, larger keys |

## Troubleshooting

### "Command not found: bun"

Install Bun: `curl -fsSL https://bun.sh/install | bash` or `brew install oven-sh/bun/bun`

### Files not saving to expected location

The CLI will:

1. Use `~/Downloads/vc-cli/` if the Downloads folder exists
2. Fall back to `~/vc-cli/` if Downloads doesn't exist (e.g., on some Linux servers)
3. Use your custom path if `--output-path` is specified

Check the output messages to see where files were saved.

### "Unsupported algorithm" error

Only ES256 and ES384 are currently supported. EdDSA support may be added in the future.

## Example Workflow

```bash
# 1. Generate your DID
bun vc-cli did generate contoso.com --lei 506700GE1G29325QX363

# 2. Files are saved to ~/Downloads/vc-cli/did-web-contoso.com/

# 3. Copy did.json to your web server
scp ~/Downloads/vc-cli/did-web-contoso.com/did.json \
    user@server:/var/www/contoso.com/.well-known/

# 4. Verify it's accessible
curl https://contoso.com/.well-known/did.json

# 5. Your DID is now resolvable: did:web:contoso.com
```

## Help Command

```bash
bun vc-cli help
```

## Version

```bash
bun vc-cli version
```

## Additional Resources

-   [W3C DID Specification](https://www.w3.org/TR/did-core/)
-   [did:web Method Specification](https://w3c-ccg.github.io/did-method-web/)
-   [Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/)
