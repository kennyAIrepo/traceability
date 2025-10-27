import { expandPath } from "../utils/path";
import type { LLMProviderType } from "../llm/providers/LLMProvider";

/**
 * Configuration loaded from environment variables
 */
export interface EnvironmentConfig {
  // LLM Provider
  llmProvider: LLMProviderType;
  llmApiKey?: string;

  // Azure OpenAI specific
  azureOpenAIEndpoint?: string;
  azureOpenAIDeploymentName?: string;

  // Issuer identity
  issuerDid?: string;
  privateKeyPath?: string;

  // Output settings
  outputDir?: string;
}

/**
 * Load configuration from environment variables
 */
export function loadFromEnv(): EnvironmentConfig {
  const provider = (process.env.LLM_PROVIDER?.toLowerCase() as LLMProviderType) || "claude";

  return {
    llmProvider: provider,
    llmApiKey: process.env.LLM_API_KEY,
    azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    issuerDid: process.env.VC_CLI_ISSUER_DID,
    privateKeyPath: process.env.VC_CLI_PRIVATE_KEY_PATH
      ? expandPath(process.env.VC_CLI_PRIVATE_KEY_PATH)
      : undefined,
    outputDir: process.env.VC_CLI_OUTPUT_DIR || "./credentials",
  };
}

/**
 * Validate required configuration for credential issuance
 */
export function validateCredentialConfig(config: EnvironmentConfig): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!config.llmApiKey) {
    missing.push("LLM_API_KEY");
  }
  if (!config.issuerDid) {
    missing.push("VC_CLI_ISSUER_DID");
  }
  if (!config.privateKeyPath) {
    missing.push("VC_CLI_PRIVATE_KEY_PATH");
  }

  return {
    valid: missing.length === 0,
    missing
  };
}
