/**
 * Google Gemini provider implementation
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LLMProvider, LLMConfig } from "./LLMProvider";
import { readImageAsBase64, getMimeType } from "./llm-utils";

/**
 * Default Gemini model
 */
export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash-exp";

/**
 * Gemini provider for document extraction using Google's Generative AI API
 */
export class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI;

  constructor(config: LLMConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  /**
   * Extract markdown content from an image using Gemini Vision API
   */
  async extractFromImage(imagePath: string, prompt: string): Promise<string> {
    const model = this.client.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL });

    const base64Image = readImageAsBase64(imagePath);
    const mimeType = getMimeType(imagePath);

    // Call Gemini Vision API
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
      prompt,
    ]);

    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new Error("No text response from Gemini Vision API");
    }

    return text;
  }

  /**
   * Extract structured data from text using Gemini
   */
  async extractFromText(prompt: string): Promise<string> {
    const model = this.client.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new Error("No text response from Gemini");
    }

    return text;
  }
}
