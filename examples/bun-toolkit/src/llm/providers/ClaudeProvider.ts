/**
 * Claude (Anthropic) provider implementation
 */

import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMConfig } from "./LLMProvider";
import { readImageAsBase64, getMimeType } from "./llm-utils";

/**
 * Default Claude model
 */
export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";

/**
 * Claude provider for document extraction using Anthropic's API
 */
export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;

  constructor(config: LLMConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  /**
   * Extract markdown content from an image using Claude Vision API
   */
  async extractFromImage(imagePath: string, prompt: string): Promise<string> {
    const base64Image = readImageAsBase64(imagePath);
    const mediaType = getMimeType(imagePath) as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    // Call Claude Vision API
    const message = await this.client.messages.create({
      model: DEFAULT_CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const responseContent = message.content[0];
    if (!responseContent || responseContent.type !== "text") {
      throw new Error("No text response from Claude Vision API");
    }

    return responseContent.text;
  }

  /**
   * Extract structured data from text using Claude
   */
  async extractFromText(prompt: string): Promise<string> {
    const message = await this.client.messages.create({
      model: DEFAULT_CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseContent = message.content[0];
    if (!responseContent || responseContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    return responseContent.text;
  }
}
