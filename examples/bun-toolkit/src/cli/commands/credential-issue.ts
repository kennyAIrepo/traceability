import { expandPath } from "../../utils/path";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { extractMarkdown, extractStructure, generateExampleData } from "../../llm/llm-client";
import { generateYamlSchema } from "../../schema/generator";
import { issueCredential as issueVC } from "../../credential/issuer";
import { loadFromEnv, validateCredentialConfig } from "../../config/env";
import type { IssueCredentialOptions } from "../cli-utils";

export async function issueCredential(sourceDocument: string, options: IssueCredentialOptions) {
  console.log(`\n📋 Command: credential issue`);
  console.log(`📄 Source document: ${sourceDocument}\n`);

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
  console.log(`   LLM Provider: ${config.llmProvider}`);
  console.log(`   Issuer: ${config.issuerDid}`);

  // Expand source document path
  const documentPath = expandPath(sourceDocument);
  if (!fs.existsSync(documentPath)) {
    console.error(`\n❌ Document file not found: ${documentPath}\n`);
    process.exit(1);
  }

  // Step 2: Extract markdown from document
  console.log(`\n📝 Extracting content from document...`);
  const llmConfig = {
    provider: config.llmProvider,
    apiKey: config.llmApiKey!,
    azureEndpoint: config.azureOpenAIEndpoint,
    azureDeploymentName: config.azureOpenAIDeploymentName,
  };
  const markdown = await extractMarkdown(documentPath, llmConfig);
  console.log(`   ✓ Content extracted (${markdown.length} characters)`);

  // Step 3: Extract structured data from markdown
  console.log(`\n🔍 Extracting structured data...`);
  const structure = await extractStructure(markdown, llmConfig);
  console.log(`   ✓ Structured data extracted`);
  console.log(`   Document type: ${structure.documentType}`);
  console.log(`   Credential types: ${structure.credentialTypes.join(", ")}`);

  // Step 3.5: Generate example data
  console.log(`\n🎭 Generating example data...`);
  const exampleData = await generateExampleData(
    structure.data,
    structure.documentType,
    llmConfig
  );
  console.log(`   ✓ Example data generated`);

  // Step 4: Generate YAML schema with examples
  console.log(`\n📐 Generating schema...`);
  const schemaResult = generateYamlSchema({
    credentialTypes: structure.credentialTypes,
    data: structure.data,
    metadata: structure.schemaMetadata,
    exampleData: exampleData,
  });
  console.log(`   ✓ Schema generated`);

  // Step 5: Issue and sign credential
  console.log(`\n🔐 Issuing verifiable credential...`);
  const credentialJWT = await issueVC(
    config.issuerDid!,
    config.privateKeyPath!,
    structure.credentialTypes,
    structure.data,
    {
      validFrom: options["valid-from"],
      validUntil: options["valid-until"],
    }
  );
  console.log(`   ✓ Credential issued and signed`);

  // Step 6: Save all three deliverables
  console.log(`\n💾 Saving outputs...`);

  // Determine storage path - append /credentials to base directory
  let outputDir: string;
  if (options["output-path"]) {
    outputDir = expandPath(options["output-path"]);
  } else {
    const homeDir = os.homedir();
    const downloadsDir = path.join(homeDir, "Downloads");

    // Check if Downloads directory exists (common on macOS, Windows, Linux desktops)
    if (fs.existsSync(downloadsDir)) {
      outputDir = path.join(downloadsDir, "vc-cli", "credentials");
    } else {
      // Fallback to home directory if Downloads doesn't exist (e.g., Linux servers)
      outputDir = path.join(homeDir, "vc-cli", "credentials");
    }
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate base filename from source document
  const baseName = path.basename(documentPath, path.extname(documentPath));
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const filePrefix = `${baseName}-${timestamp}`;

  // Save markdown
  const markdownPath = path.join(outputDir, `${filePrefix}.md`);
  await Bun.write(markdownPath, markdown);
  console.log(`   ✓ Markdown: ${markdownPath}`);

  // Save schema
  const schemaPath = path.join(outputDir, `${filePrefix}-schema.yaml`);
  await Bun.write(schemaPath, schemaResult.yaml);
  console.log(`   ✓ Schema: ${schemaPath}`);

  // Save credential (as raw JWT text)
  const credentialPath = path.join(outputDir, `${filePrefix}.vc.jwt.txt`);
  await Bun.write(credentialPath, credentialJWT);
  console.log(`   ✓ Credential: ${credentialPath}`);

  console.log(`\n✅ Credential issuance complete!\n`);
}
