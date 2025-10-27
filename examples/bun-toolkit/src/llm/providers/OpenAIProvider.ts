/**
 * OpenAI provider implementation
 */

import OpenAI from "openai";
import type { LLMProvider, LLMConfig } from "./LLMProvider";
import { readImageAsBase64, getMimeType } from "./llm-utils";

/**
 * Default OpenAI model
 */
export const DEFAULT_OPENAI_MODEL = "gpt-4o";

/**
 * OpenAI provider for document extraction using OpenAI's API
 */
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor(config: LLMConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  /**
   * Extract markdown content from an image using OpenAI Vision API
   */
  async extractFromImage(imagePath: string, prompt: string): Promise<string> {
    const base64Image = readImageAsBase64(imagePath);
    const mimeType = getMimeType(imagePath);
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // Call OpenAI Vision API
    const response = await this.client.chat.completions.create({
      model: DEFAULT_OPENAI_MODEL,
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
      throw new Error("No text response from OpenAI Vision API");
    }

    return messageContent;
  }

  /**
   * Extract structured data from text using OpenAI
   */
  async extractFromText(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: DEFAULT_OPENAI_MODEL,
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
      throw new Error("No text response from OpenAI");
    }

    return messageContent;
  }
}
