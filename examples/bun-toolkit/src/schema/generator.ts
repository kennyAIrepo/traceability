/**
 * JSON Schema generator for verifiable credentials
 */

import * as yaml from "js-yaml";
import { randomUUID } from "crypto";

export interface SchemaMetadata {
  title: string;
  description: string;
}

export interface GenerateSchemaOptions {
  credentialTypes: string[];
  data: Record<string, unknown>;
  metadata: SchemaMetadata;
  schemaId?: string;
  exampleData?: Record<string, unknown>;
}

export interface GeneratedSchema {
  yaml: string;
  schemaId: string;
}

/**
 * Generate a JSON Schema (in YAML format) from extracted data
 * Follows W3C VC v2 structure with dynamic credentialSubject based on extracted data
 * @param options Schema generation options
 * @returns Generated schema with ID
 */
export function generateYamlSchema(
  options: GenerateSchemaOptions
): GeneratedSchema {
  const schemaId = options.schemaId || generateSchemaId();

  // Build the JSON Schema object
  const schema: any = {
    $id: schemaId,
    title: options.metadata.title,
    description: options.metadata.description,
    type: "object",
    required: ["@context", "type", "issuer", "credentialSubject"],
    properties: {
      "@context": {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        contains: {
          const: "https://www.w3.org/ns/credentials/v2"
        }
      },
      type: {
        type: "array",
        items: { type: "string" },
        minItems: options.credentialTypes.length,
        contains: {
          enum: options.credentialTypes
        }
      },
      issuer: {
        type: "string",
        format: "uri",
        description: "DID of the credential issuer"
      },
      validFrom: {
        type: "string",
        format: "date-time",
        description: "When the credential becomes valid"
      },
      validUntil: {
        type: "string",
        format: "date-time",
        description: "When the credential expires (optional)"
      },
      credentialSchema: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "type"],
          properties: {
            id: {
              type: "string",
              format: "uri"
            },
            type: {
              type: "string",
              enum: ["JsonSchema"]
            }
          }
        }
      },
      credentialSubject: {
        type: "object",
        description: "The credential data extracted from the source document",
        properties: inferSchemaProperties(options.data),
        required: Object.keys(options.data)
      }
    }
  };

  // Add examples at root level if provided
  if (options.exampleData) {
    schema.examples = [
      {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        type: options.credentialTypes,
        issuer: "did:web:example.com",
        validFrom: "2025-01-01T00:00:00Z",
        credentialSubject: options.exampleData
      }
    ];
  }

  // Convert to YAML with proper formatting
  const yamlString = yaml.dump(schema, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false
  });

  return {
    yaml: yamlString,
    schemaId
  };
}

/**
 * Infer JSON Schema properties from data structure
 * @param data The data object to analyze
 * @returns JSON Schema properties definition
 */
function inferSchemaProperties(data: Record<string, unknown>): Record<string, any> {
  const properties: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    properties[key] = inferSchemaType(value);
  }

  return properties;
}

/**
 * Infer JSON Schema type from a value
 * @param value The value to analyze
 * @returns JSON Schema type definition
 */
function inferSchemaType(value: unknown): any {
  if (value === null || value === undefined) {
    return { type: "null" };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { type: "array", items: {} };
    }
    // Infer items schema from first element
    return {
      type: "array",
      items: inferSchemaType(value[0])
    };
  }

  if (typeof value === "object") {
    return {
      type: "object",
      properties: inferSchemaProperties(value as Record<string, unknown>),
      required: Object.keys(value as Record<string, unknown>)
    };
  }

  if (typeof value === "number") {
    return { type: "number" };
  }

  if (typeof value === "boolean") {
    return { type: "boolean" };
  }

  if (typeof value === "string") {
    // Check if it looks like a date
    if (isISODate(value)) {
      return { type: "string", format: "date-time" };
    }
    // Check if it looks like a URI
    if (isURI(value)) {
      return { type: "string", format: "uri" };
    }
    return { type: "string" };
  }

  return {};
}

/**
 * Check if a string looks like an ISO date
 */
function isISODate(str: string): boolean {
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  return isoDatePattern.test(str);
}

/**
 * Check if a string looks like a URI
 */
function isURI(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a UUID identifier for the schema
 * @returns UUID in urn:uuid: format
 */
export function generateSchemaId(): string {
  return `urn:uuid:${randomUUID()}`;
}
