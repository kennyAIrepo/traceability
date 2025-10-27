/**
 * Azure OpenAI provider implementation
 */

import OpenAI from "openai";
import type { LLMProvider, LLMConfig } from "./LLMProvider";
import { readImageAsBase64, getMimeType } from "./llm-utils";

/**
 * Azure OpenAI API version (hardcoded to avoid configuration complexity)
 */
const AZURE_OPENAI_API_VERSION = "2024-02-15-preview";

/**
 * Azure OpenAI configuration
 */
export interface AzureOpenAIConfig extends LLMConfig {
  endpoint: string;
  deploymentName: string;
}

/**
 * Azure OpenAI provider for document extraction using Azure's OpenAI service
 */
export class AzureOpenAIProvider implements LLMProvider {
  private config: AzureOpenAIConfig;
  private client: OpenAI;

  constructor(config: AzureOpenAIConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: `${config.endpoint}/openai/deployments/${config.deploymentName}`,
      defaultQuery: { "api-version": AZURE_OPENAI_API_VERSION },
      defaultHeaders: { "api-key": config.apiKey },
    });
  }

  /**
   * Extract markdown content from an image using Azure OpenAI Vision API
   */
  async extractFromImage(imagePath: string, prompt: string): Promise<string> {
    const base64Image = readImageAsBase64(imagePath);
    const mimeType = getMimeType(imagePath);
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await this.client.chat.completions.create({
      model: this.config.deploymentName,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      max_tokens: 4096,
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      throw new Error("No text response from Azure OpenAI Vision API");
    }

    return messageContent;
  }

  /**
   * Extract structured data from text using Azure OpenAI
   */
  async extractFromText(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.config.deploymentName,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 4096,
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      throw new Error("No text response from Azure OpenAI");
    }

    return messageContent;
  }
}
