/**
 * Environment-aware generateJSON utility for TipTap HTML conversion
 *
 * This module provides a unified interface for converting HTML to ProseMirror JSON
 * that automatically selects the appropriate TipTap generateJSON function based on
 * the execution environment (browser vs Node.js).
 */

import type { Extensions } from "@tiptap/core";
import { ParseOptions } from "prosemirror-model";

// Types for generateJSON function signature
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenerateJSONReturnType = Record<string, any>;
type GenerateJSONFunction = (
  html: string,
  extensions: Extensions,
  options?: ParseOptions
) => GenerateJSONReturnType;

// Cache for imported generateJSON functions
let generateJSONClientCache: GenerateJSONFunction | null = null;
let generateJSONServerCache: GenerateJSONFunction | null = null;

/**
 * Gets the client-side generateJSON function from @tiptap/html
 * Caches the import for subsequent calls
 */
const getGenerateJSONClient = async (): Promise<GenerateJSONFunction> => {
  if (!generateJSONClientCache) {
    const module = await import("@tiptap/html");
    generateJSONClientCache = module.generateJSON;
  }
  return generateJSONClientCache!;
};

/**
 * Gets the server-side generateJSON function from @tiptap/html/server
 * Uses @vite-ignore to prevent bundlers from analyzing the server import
 * Caches the import for subsequent calls
 */
const getGenerateJSONServer = async (): Promise<GenerateJSONFunction> => {
  if (!generateJSONServerCache) {
    // Use string template to avoid static analysis by bundlers
    const serverModule = "@tiptap/html/server";
    const module = await import(/* @vite-ignore */ serverModule);
    generateJSONServerCache = module.generateJSON;
  }
  return generateJSONServerCache!;
};

/**
 * Generates a JSON object from the given HTML string and converts it into a ProseMirror node with content.
 * Automatically detects the execution environment and uses the appropriate TipTap generateJSON function:
 * - Browser environment: Uses @tiptap/html (DOM-based)
 * - Node.js environment: Uses @tiptap/html/server (DOM-independent)
 *
 * @param {string} html - The HTML string to be converted into a ProseMirror node.
 * @param {Extensions} extensions - The extensions to be used for generating the schema.
 * @param {ParseOptions} options - The options to be supplied to the parser.
 * @returns {Promise<Record<string, any>>} - The generated JSON object.
 * @example
 * const html = '<p>Hello, world!</p>'
 * const extensions = [StarterKit]
 * const json = await generateJSON(html, extensions)
 * console.log(json) // { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello, world!' }] }] }
 */
export const generateJSON = async (
  html: string,
  extensions: Extensions,
  options?: ParseOptions
): Promise<GenerateJSONReturnType> => {
  const generateJSONFn = await (typeof window !== "undefined"
    ? getGenerateJSONClient()
    : getGenerateJSONServer());
  return generateJSONFn(html, extensions, options);
};

/**
 * Generates a JSON object from the given HTML string using the client-side TipTap implementation.
 * For explicit browser usage only. Use the main `generateJSON` function for automatic environment detection.
 *
 * @param {string} html - The HTML string to be converted into a ProseMirror node.
 * @param {Extensions} extensions - The extensions to be used for generating the schema.
 * @param {ParseOptions} options - The options to be supplied to the parser.
 * @returns {Promise<Record<string, any>>} - The generated JSON object.
 */
export const generateJSONClient = async (
  html: string,
  extensions: Extensions,
  options?: ParseOptions
): Promise<GenerateJSONReturnType> => {
  const generateJSONFn = await getGenerateJSONClient();
  return generateJSONFn(html, extensions, options);
};

/**
 * Generates a JSON object from the given HTML string using the server-side TipTap implementation.
 * For explicit server usage only. Use the main `generateJSON` function for automatic environment detection.
 *
 * @param {string} html - The HTML string to be converted into a ProseMirror node.
 * @param {Extensions} extensions - The extensions to be used for generating the schema.
 * @param {ParseOptions} options - The options to be supplied to the parser.
 * @returns {Promise<Record<string, any>>} - The generated JSON object.
 */
export const generateJSONServer = async (
  html: string,
  extensions: Extensions,
  options?: ParseOptions
): Promise<GenerateJSONReturnType> => {
  const generateJSONFn = await getGenerateJSONServer();
  return generateJSONFn(html, extensions, options);
};
