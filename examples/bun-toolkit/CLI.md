# VC-CLI: Verifiable Credentials Toolkit

A command-line tool for managing `did:web` identifiers and issuing verifiable credentials from documents.

## Prerequisites

-   [Bun](https://bun.sh) installed on your system
-   This repository cloned locally
-   For credential issuance: LLM API key (Claude, Gemini, or OpenAI)

## Quick Start

Navigate to the toolkit directory:

```bash
cd examples/bun-toolkit
```

### Generate a DID

```bash
bun vc-cli did generate contoso.com
```

This will:

-   Generate two cryptographic key pairs (ES256 by default)
-   Create a W3C-compliant DID document
-   Save files to `~/Downloads/vc-cli/did-web-contoso.com/`

### Issue a Credential from a Document

```bash
# Set up environment variables first (see Configuration section)
bun vc-cli credential issue ~/Downloads/document.pdf
```

This will:

-   Extract content from the document using AI
-   Generate structured credential data
-   Create a JSON Schema
-   Issue and sign a verifiable credential
-   Save three files: `.md`, `-schema.yaml`, `.vc.jwt.txt`

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

### Managing Verifiable Credentials

#### Issuing Credentials from Documents

Issue verifiable credentials by extracting data from documents using AI:

```bash
bun vc-cli credential issue <document-file> [options]
```

**Examples:**

Issue a credential from a PDF:

```bash
bun vc-cli credential issue ~/Downloads/metallurgical-report.pdf
```

Issue with custom output location:

```bash
bun vc-cli credential issue invoice.png --output-path ~/credentials
```

Override issuer and private key:

```bash
bun vc-cli credential issue document.pdf \
  --issuer did:web:example.com \
  --private-key ~/keys/private-key.json
```

Set validity period:

```bash
bun vc-cli credential issue certificate.pdf \
  --valid-from 2025-01-01T00:00:00Z \
  --valid-until 2026-01-01T00:00:00Z
```

**Supported Document Formats:**

-   **Images**: PNG, JPG, JPEG, GIF, WebP
-   **Documents**: PDF
-   **Text**: JSON, CSV, YAML, TXT, Markdown

**What the credential issue command does:**

1. 📝 **Extracts content** from the document using LLM Vision API (for images/PDFs) or direct parsing (for text files)
2. 🔍 **Structures the data** using AI to identify key fields and relationships
3. 📐 **Generates a JSON Schema** that describes the credential structure
4. 🔐 **Issues and signs** a W3C Verifiable Credential using your private key
5. 💾 **Saves three files**:
    - `{filename}-{timestamp}.md` - Extracted markdown representation
    - `{filename}-{timestamp}-schema.yaml` - JSON Schema definition
    - `{filename}-{timestamp}.vc.jwt.txt` - Signed verifiable credential (JWT)

**Credential Issue Options:**

| Option                      | Description                                 | Default             |
| --------------------------- | ------------------------------------------- | ------------------- |
| `--issuer <did>`            | Override issuer DID                         | From env            |
| `--private-key <path>`      | Override private key path                   | From env            |
| `--output-path <path>`      | Output directory                            | `~/Downloads/vc-cli/` |
| `--valid-from <date>`       | Credential validity start (ISO 8601 format) | Current timestamp   |
| `--valid-until <date>`      | Credential validity end (ISO 8601 format)   | No expiration       |

#### Signing Credentials

Sign an existing credential JSON file:

```bash
bun vc-cli credential sign <credential.json> [options]
```

**Examples:**

Sign a credential file:

```bash
bun vc-cli credential sign ~/Documents/my-credential.json
```

Override issuer and private key:

```bash
bun vc-cli credential sign credential.json \
  --issuer did:web:example.com \
  --private-key ~/keys/private-key.json
```

Specify output location:

```bash
bun vc-cli credential sign credential.json --output-path ~/signed-credentials
```

**What the credential sign command does:**

1. 📖 **Reads the credential JSON file** and validates it has required fields (`@context`, `type`, `credentialSubject`)
2. 🔐 **Signs the credential** using your private key
3. 💾 **Saves the signed JWT** to `{filename}-signed-{timestamp}.vc.jwt.txt`

**Credential Sign Options:**

| Option                 | Description           | Default                 |
| ---------------------- | --------------------- | ----------------------- |
| `--issuer <did>`       | Override issuer DID   | From env or credential  |
| `--private-key <path>` | Override private key  | From env                |
| `--output-path <path>` | Output directory      | `~/Downloads/vc-cli/credentials` |

#### Verifying Credentials

Verify a signed credential JWT:

```bash
bun vc-cli credential verify <credential.jwt> [options]
```

**Examples:**

Verify a credential:

```bash
bun vc-cli credential verify ~/Downloads/credential.vc.jwt.txt
```

Verify with schema validation:

```bash
bun vc-cli credential verify credential.vc.jwt.txt \
  --schema ~/schemas/my-schema.yaml
```

**What the credential verify command does:**

1. ✅ **Verifies the credential** by decoding the JWT
2. 🌐 **Resolves the issuer DID** by fetching the DID document from the web (did:web resolution)
3. 🔐 **Validates the signature** using the issuer's public key
4. 📋 **Validates against schema** (if `--schema` provided) to ensure the credential matches the expected structure
5. 📊 **Displays verification results** including issuer, type, validity dates, and signature status

**Verification Steps Performed:**

- → Verifying credential...
- → Resolving issuer DID...
- → Validating signature...
- → Validating schema... (if schema provided)
- ✓ Credential verified successfully

**Verification Details Displayed:**

- ✓ **Issuer**: The DID of the credential issuer
- ✓ **Type**: The credential type(s)
- ✓ **Valid From**: When the credential becomes valid
- ✓ **Valid Until**: When the credential expires (if set)
- ✓ **Signature**: Valid/Invalid status
- ✓ **Schema**: Valid/Invalid status (if schema validation was performed)

**Credential Verify Options:**

| Option            | Description                             | Default |
| ----------------- | --------------------------------------- | ------- |
| `--schema <path>` | Optional YAML schema file to validate against | None    |

### Managing Verifiable Presentations

#### Creating Presentations

Create a verifiable presentation from one or more signed credentials:

```bash
bun vc-cli presentation create <path> [path2 ...] [options]
```

**Note:** Each `<path>` can be either:
- A **credential file** (e.g., `cert.vc.jwt.txt`)
- A **directory** containing credential files (automatically scans for `*.vc.jwt.txt` files)

**Examples:**

Create a presentation from all credentials in a directory:

```bash
bun vc-cli presentation create ~/Downloads/vc-cli/credentials
```

Create a presentation with a single credential file:

```bash
bun vc-cli presentation create ~/Downloads/vc-cli/credentials/cert.vc.jwt.txt
```

Create a presentation with multiple credential files:

```bash
bun vc-cli presentation create \
  ~/Downloads/vc-cli/credentials/cert1.vc.jwt.txt \
  ~/Downloads/vc-cli/credentials/cert2.vc.jwt.txt
```

Mix directories and files:

```bash
bun vc-cli presentation create \
  ~/Downloads/vc-cli/credentials \
  ~/special-cert.vc.jwt.txt
```

Override holder DID:

```bash
bun vc-cli presentation create ~/Downloads/vc-cli/credentials \
  --holder did:web:holder.example.com
```

Set custom expiration (in seconds):

```bash
bun vc-cli presentation create ~/Downloads/vc-cli/credentials \
  --expires-in 1800
```

**What the presentation create command does:**

1. 📝 **Loads credential JWT files** and validates they exist
2. 📦 **Creates enveloped credentials** in W3C VC v2 format
3. 🎭 **Builds a verifiable presentation** with the holder's DID
4. 🔐 **Signs the presentation** using the holder's authentication key
5. 💾 **Saves the signed presentation** to `presentation-{timestamp}.vp.jwt.txt`

**Presentation Create Options:**

| Option                 | Description                                 | Default                       |
| ---------------------- | ------------------------------------------- | ----------------------------- |
| `--holder <did>`       | Override holder DID                         | From env (VC_CLI_ISSUER_DID)  |
| `--private-key <path>` | Override private key path                   | From env                      |
| `--output-path <path>` | Output directory                            | `~/Downloads/vc-cli/presentations` |
| `--expires-in <seconds>` | Presentation expiration time in seconds   | 3600 (1 hour)                 |

**Important Notes:**

- Presentations use the **authentication key** (not the assertion key used for issuing credentials)
- The holder DID defaults to your configured issuer DID from `.env`
- Presentations are typically short-lived for security (default 1 hour)
- Multiple credentials can be bundled in a single presentation
- Each credential is wrapped as an `EnvelopedVerifiableCredential`

## Configuration

Before issuing credentials, create a `.env` file in the toolkit directory:

```bash
# LLM Configuration
# Required for credential issuance from documents

# LLM Provider: "claude", "gemini", "openai", or "azure-openai" (default: claude)
# LLM_PROVIDER=claude

# LLM API Key
# For Claude: Get your API key from https://console.anthropic.com
# For Gemini: Get your API key from https://aistudio.google.com/apikey
# For OpenAI: Get your API key from https://platform.openai.com/api-keys
# For Azure OpenAI: Get your API key from Azure Portal (Keys and Endpoint section)
LLM_API_KEY=your-api-key-here

# Azure OpenAI Configuration (only needed if LLM_PROVIDER=azure-openai)
# AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
# AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name

# Verifiable Credential Issuer Configuration
# Required for signing credentials
VC_CLI_ISSUER_DID=did:web:your-domain.com
VC_CLI_PRIVATE_KEY_PATH=~/Downloads/vc-cli/did-web-your-domain.com/private-key.json

# Optional: Output directory for generated files
# VC_CLI_OUTPUT_DIR=~/Downloads/vc-cli/credentials
```

### Supported LLM Providers

The CLI supports multiple LLM providers for document extraction:

- **Claude (Anthropic)** - Default provider using Claude Sonnet 4.5
  - Get API key from: https://console.anthropic.com
  - Set `LLM_PROVIDER=claude` (or omit, as it's the default)
  - Model: `claude-sonnet-4-20250514`

- **Google Gemini** - Google's Generative AI
  - Get API key from: https://aistudio.google.com/apikey
  - Set `LLM_PROVIDER=gemini`
  - Model: `gemini-2.0-flash-exp`

- **OpenAI** - OpenAI's GPT models
  - Get API key from: https://platform.openai.com/api-keys
  - Set `LLM_PROVIDER=openai`
  - Model: `gpt-4o`

- **Azure OpenAI** - Microsoft's Azure OpenAI Service
  - Get API key from: Azure Portal (Keys and Endpoint section of your Azure OpenAI resource)
  - Set `LLM_PROVIDER=azure-openai`
  - Also requires: `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_DEPLOYMENT_NAME`
  - Model: Uses your configured deployment (e.g., `gpt-4o`, `gpt-4`)

See `.env.example` for a complete template.

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

## Example Workflows

### Workflow 1: Set Up Your DID

```bash
# 1. Generate your DID
bun vc-cli did generate contoso.com --lei 506700GE1G29325QX363

# 2. Files are saved to ~/Downloads/vc-cli/did-web-contoso.com/

# 3. Copy did.json to your web server
scp ~/Downloads/vc-cli/did-web-contoso.com/did.json \
    user@server:/var/www/contoso.com/.well-known/

# 4. Verify it's accessible
curl https://contoso.com/.well-known/did.json

# 5. Verify using the CLI
bun vc-cli did verify did:web:contoso.com

# 6. Your DID is now resolvable: did:web:contoso.com
```

### Workflow 2: Issue a Credential from a Document

```bash
# 1. Set up your .env file with API keys and DID configuration
cp .env.example .env
# Edit .env with your API key and DID

# 2. Issue a credential from a document
bun vc-cli credential issue ~/Documents/certificate.pdf

# 3. Three files are created in ~/Downloads/vc-cli/:
#    - certificate-2025-10-15T19-43-15.md (extracted content)
#    - certificate-2025-10-15T19-43-15-schema.yaml (JSON Schema)
#    - certificate-2025-10-15T19-43-15.vc.jwt.txt (signed credential)

# 4. The .vc.jwt.txt file contains the verifiable credential
#    that can be shared and verified by anyone
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
