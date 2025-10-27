/**
 * LLM Provider interface for document extraction
 *
 * Abstracts LLM-specific implementation details to support multiple providers
 * (Claude, Azure OpenAI, etc.)
 */

/**
 * Supported LLM provider types
 */
export type LLMProviderType = "claude" | "gemini" | "openai" | "azure-openai";

export interface LLMConfig {
  apiKey: string;
  model?: string;
}

/**
 * Base interface for LLM providers
 */
export interface LLMProvider {
  /**
   * Extract markdown content from an image
   * @param imagePath Path to the image file
   * @param prompt The extraction prompt
   * @returns Extracted markdown content
   */
  extractFromImage(imagePath: string, prompt: string): Promise<string>;

  /**
   * Extract structured data from text/markdown
   * @param prompt The extraction prompt
   * @returns LLM response as string (typically JSON)
   */
  extractFromText(prompt: string): Promise<string>;
}
