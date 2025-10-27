/**
 * AI prompt templates for document processing
 */

/**
 * Step 1: Convert document to Markdown
 */
export const DOCUMENT_TO_MARKDOWN_PROMPT = `
Convert this document to well-structured Markdown format.

Instructions:
1. Perform OCR to extract all text from the image/PDF
2. Preserve document structure (headings, tables, lists)
3. Use proper Markdown syntax:
   - # for main headings
   - ## for subheadings
   - Tables with | syntax
   - Lists with - or *
4. Preserve all data exactly as it appears
5. Include any visible metadata (dates, IDs, reference numbers)
6. Maintain spatial relationships (e.g., label-value pairs)

Return only the Markdown content, no additional commentary.
`.trim();

/**
 * Step 2: Extract structured data from Markdown
 */
export function getStructureExtractionPrompt(markdown: string): string {
  return `
Analyze this Markdown document and extract structured data.

Instructions:
1. Identify the document type (e.g., "CommercialInvoice", "BillOfLading", "PurchaseOrder", "CertificateOfOrigin")
2. Extract all relevant data into a well-structured JSON object
3. Use semantic field names (camelCase)
4. Infer appropriate data types (string, number, boolean, arrays, objects)
5. Suggest W3C Verifiable Credential type names based on the document type
6. If the document has a natural identifier (invoice number, shipment ID, etc.), include it

Return a JSON response with this exact structure:
{
  "documentType": "string (human-readable type)",
  "credentialTypes": ["VerifiableCredential", "SpecificTypeCredential"],
  "data": {
    /* extracted structured data with semantic field names */
  },
  "schemaMetadata": {
    "title": "string (descriptive schema title)",
    "description": "string (what this schema represents)"
  }
}

Document content:
${markdown}
`.trim();
}
