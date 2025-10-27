/**
 * LLM client for document processing
 * Supports multiple LLM providers (Claude, Gemini, OpenAI)
 */

import { getStructureExtractionPrompt, DOCUMENT_TO_MARKDOWN_PROMPT } from "./prompts";
import * as fs from "fs";
import * as path from "path";
import { pdfToPng } from "pdf-to-png-converter";
import type { LLMProvider, LLMProviderType } from "./providers/LLMProvider";
import { ClaudeProvider } from "./providers/ClaudeProvider";
import { GeminiProvider } from "./providers/GeminiProvider";
import { OpenAIProvider } from "./providers/OpenAIProvider";
import { AzureOpenAIProvider } from "./providers/AzureOpenAIProvider";

/**
 * LLM client configuration
 */
export interface LLMClientConfig {
  provider: LLMProviderType;
  apiKey: string;
  // Azure OpenAI specific configuration
  azureEndpoint?: string;
  azureDeploymentName?: string;
}

/**
 * Supported image file extensions for vision API
 */
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

/**
 * Text-based file extensions that can be converted directly
 */
const TEXT_EXTENSIONS = [".txt", ".json", ".yaml", ".yml", ".csv", ".md"];

/**
 * Get the appropriate LLM provider based on configuration
 */
function getProvider(config: LLMClientConfig): LLMProvider {
  switch (config.provider) {
    case "claude":
      return new ClaudeProvider({
        apiKey: config.apiKey,
      });

    case "gemini":
      return new GeminiProvider({
        apiKey: config.apiKey,
      });

    case "openai":
      return new OpenAIProvider({
        apiKey: config.apiKey,
      });

    case "azure-openai":
      if (!config.azureEndpoint || !config.azureDeploymentName) {
        throw new Error("Azure OpenAI requires azureEndpoint and azureDeploymentName in config");
      }
      return new AzureOpenAIProvider({
        apiKey: config.apiKey,
        endpoint: config.azureEndpoint,
        deploymentName: config.azureDeploymentName,
      });

    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

/**
 * Extract markdown from a document using LLM Vision or text processing
 * @param documentPath Path to the document file
 * @param config LLM client configuration
 * @returns Extracted markdown content
 */
export async function extractMarkdown(
  documentPath: string,
  config: LLMClientConfig
): Promise<string> {
  const ext = path.extname(documentPath).toLowerCase();

  // Check if file exists
  if (!fs.existsSync(documentPath)) {
    throw new Error(`Document file not found: ${documentPath}`);
  }

  // Handle text-based formats - convert directly to markdown
  if (TEXT_EXTENSIONS.includes(ext)) {
    return convertTextToMarkdown(documentPath, ext);
  }

  // Handle PDF - use Vision API
  if (ext === ".pdf") {
    return extractFromPdfVision(documentPath, config);
  }

  // Handle images - use Vision API
  if (IMAGE_EXTENSIONS.includes(ext)) {
    return extractFromImageVision(documentPath, config);
  }

  // Unsupported format
  throw new Error(
    `Unsupported file format: ${ext}\n` +
    `Supported formats:\n` +
    `  Images: ${IMAGE_EXTENSIONS.join(", ")}\n` +
    `  Documents: .pdf\n` +
    `  Text: ${TEXT_EXTENSIONS.join(", ")}`
  );
}

/**
 * Convert text-based files to markdown format
 */
function convertTextToMarkdown(filePath: string, ext: string): string {
  const content = fs.readFileSync(filePath, "utf-8");

  switch (ext) {
    case ".md":
      // Already markdown
      return content;

    case ".txt":
      // Plain text - just return with basic formatting
      return content;

    case ".json":
      // Convert JSON to formatted markdown
      return convertJsonToMarkdown(content);

    case ".yaml":
    case ".yml":
      // Convert YAML to formatted markdown
      return convertYamlToMarkdown(content);

    case ".csv":
      // Convert CSV to markdown table
      return convertCsvToMarkdown(content);

    default:
      return content;
  }
}

/**
 * Convert JSON to markdown
 */
function convertJsonToMarkdown(jsonContent: string): string {
  try {
    const data = JSON.parse(jsonContent);
    let markdown = "# JSON Document\n\n";
    markdown += "```json\n";
    markdown += JSON.stringify(data, null, 2);
    markdown += "\n```\n";
    return markdown;
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error}`);
  }
}

/**
 * Convert YAML to markdown
 */
function convertYamlToMarkdown(yamlContent: string): string {
  let markdown = "# YAML Document\n\n";
  markdown += "```yaml\n";
  markdown += yamlContent;
  markdown += "\n```\n";
  return markdown;
}

/**
 * Convert CSV to markdown table
 */
function convertCsvToMarkdown(csvContent: string): string {
  const lines = csvContent.trim().split("\n");
  if (lines.length === 0) {
    return "";
  }

  let markdown = "# CSV Document\n\n";

  // Parse CSV (simple implementation - doesn't handle quoted commas)
  const rows = lines.map(line => line.split(",").map(cell => cell.trim()));

  // Header row
  const headerRow = rows[0];
  if (headerRow) {
    markdown += "| " + headerRow.join(" | ") + " |\n";
    markdown += "| " + headerRow.map(() => "---").join(" | ") + " |\n";
  }

  // Data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row) {
      markdown += "| " + row.join(" | ") + " |\n";
    }
  }

  return markdown;
}

/**
 * Extract markdown from image using LLM Vision
 */
async function extractFromImageVision(
  imagePath: string,
  config: LLMClientConfig
): Promise<string> {
  const provider = getProvider(config);
  return provider.extractFromImage(imagePath, DOCUMENT_TO_MARKDOWN_PROMPT);
}

/**
 * Extract markdown from PDF by converting to images and using Vision API
 * 1. Convert PDF pages to PNG images
 * 2. Send each image to LLM Vision API
 * 3. Combine results from all pages
 */
async function extractFromPdfVision(
  pdfPath: string,
  config: LLMClientConfig
): Promise<string> {
  const provider = getProvider(config);

  // Convert PDF to PNG images (one per page)
  const pngPages = await pdfToPng(pdfPath, {
    outputFolder: "/tmp/pdf-conversion",
    viewportScale: 2.0,
  });

  if (!pngPages || pngPages.length === 0) {
    throw new Error("Failed to convert PDF to images");
  }

  try {
    // Process each page with Vision API
    const pageMarkdowns: string[] = [];

    for (let i = 0; i < pngPages.length; i++) {
      const page = pngPages[i];
      if (!page) continue;

      // Write temporary file for this page
      const tempPath = `/tmp/pdf-page-${i}.png`;
      fs.writeFileSync(tempPath, page.content);

      try {
        const prompt = `${DOCUMENT_TO_MARKDOWN_PROMPT}\n\nThis is page ${i + 1} of ${pngPages.length}.`;
        const markdown = await provider.extractFromImage(tempPath, prompt);
        pageMarkdowns.push(markdown);
      } finally {
        // Clean up temp page file
        try {
          fs.unlinkSync(tempPath);
        } catch (err) {
          // Ignore cleanup errors
        }
      }
    }

    // Combine all pages with page breaks
    return pageMarkdowns.join("\n\n---\n\n");
  } finally {
    // Clean up temporary PNG files from pdf-to-png-converter
    for (const page of pngPages) {
      try {
        fs.unlinkSync(page.path);
      } catch (err) {
        // Ignore cleanup errors - file may not exist or already deleted
      }
    }

    // Try to remove the temp directory if it's empty
    try {
      fs.rmdirSync("/tmp/pdf-conversion");
    } catch (err) {
      // Directory not empty or doesn't exist - ignore
    }
  }
}

/**
 * Extract structured data from markdown using LLM
 * @param markdown Markdown content
 * @param config LLM client configuration
 * @returns Structured extraction result
 */
export async function extractStructure(
  markdown: string,
  config: LLMClientConfig
): Promise<StructureExtractionResult> {
  const provider = getProvider(config);
  const prompt = getStructureExtractionPrompt(markdown);

  const responseText = await provider.extractFromText(prompt);

  // Parse the JSON response
  let result: StructureExtractionResult;
  try {
    // LLM may wrap JSON in markdown code blocks, so extract it
    let jsonText = responseText;
    const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonText = jsonMatch[1];
    }
    result = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Failed to parse LLM response as JSON: ${error}\nResponse: ${responseText}`);
  }

  // Validate the response has required fields
  if (!result.documentType || !result.credentialTypes || !result.data || !result.schemaMetadata) {
    throw new Error("Invalid response structure from LLM");
  }

  return result;
}

/**
 * Result of structure extraction from markdown
 */
export interface StructureExtractionResult {
  documentType: string;
  credentialTypes: string[];
  data: Record<string, unknown>;
  schemaMetadata: {
    title: string;
    description: string;
  };
}

/**
 * Generate example data from real extracted data
 * Creates completely fictional/fake data that matches the structure but contains no real information
 * @param realData The actual extracted data structure
 * @param documentType The type of document (for context)
 * @param config LLM client configuration
 * @returns Example data with fictional values
 */
export async function generateExampleData(
  realData: Record<string, unknown>,
  documentType: string,
  config: LLMClientConfig
): Promise<Record<string, unknown>> {
  const provider = getProvider(config);

  const prompt = `You are generating FICTIONAL example data for a JSON schema.

Given this real data structure from a ${documentType}:
${JSON.stringify(realData, null, 2)}

Generate a COMPLETE example that:
1. Has the EXACT SAME structure (same keys, same nesting, same array lengths)
2. Uses completely FICTIONAL/FAKE values (fake company names, fake IDs, fake numbers, fake dates)
3. For company/organization names: Use OBVIOUSLY fictional but professional names like "Example Steel Corp", "Sample Manufacturing Inc", "Test Industries LLC", "Demo Materials Co", etc.
4. For person names: Use OBVIOUSLY fictional names like "Jane Doe", "John Smith", "Bob Example", "Alice Sample", etc.
5. Keep all other fake data plausible (addresses, numbers, dates)
6. Maintains the same data types (strings stay strings, numbers stay numbers, etc.)
7. Returns ONLY the JSON object, no explanation

Return the example data as a JSON object.`;

  const responseText = await provider.extractFromText(prompt);

  // Parse the JSON response
  let exampleData: Record<string, unknown>;
  try {
    // LLM may wrap JSON in markdown code blocks, so extract it
    let jsonText = responseText;
    const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonText = jsonMatch[1];
    }
    exampleData = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Failed to parse example data as JSON: ${error}\nResponse: ${responseText}`);
  }

  return exampleData;
}
