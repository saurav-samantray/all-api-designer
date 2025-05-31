const yaml = require('js-yaml');
const path = require('path');

/**
 * Gets the lowercase file extension from a filename.
 * @param {string} filename - The name of the file.
 * @returns {string} The lowercase file extension (e.g., '.json', '.yaml').
 */
function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';
  return path.extname(filename).toLowerCase();
}

/**
 * Parses file content based on its extension.
 * @param {string} content - The raw string content of the file.
 * @param {string} extension - The file extension (e.g., '.json', '.yaml').
 * @returns {object | null} The parsed JavaScript object, or null if parsing fails or not applicable.
 */
function parseFileContent(content, extension) {
  try {
    if (extension === '.json') {
      return JSON.parse(content);
    } else if (extension === '.yaml' || extension === '.yml') {
      return yaml.load(content);
    }
  } catch (e) {
    console.warn(\`Failed to parse content for extension \${extension}: \${e.message}\`);
    return null; // Indicates parsing failure
  }
  return null; // Not a parsable type by this function
}

/**
 * Identifies the specification type and version from parsed file content.
 * @param {object} parsedContent - The parsed content of the file (JavaScript object).
 * @returns {{type: string, version: string | null, isValid: boolean, isSpec: boolean}}
 *          An object containing the type (e.g., 'openapi', 'asyncapi', 'json_schema', 'json', 'yaml', 'unknown'),
 *          its version string, and a boolean indicating if it's a recognized spec.
 */
function identifySpecFormat(parsedContent) {
  if (!parsedContent || typeof parsedContent !== 'object') {
    return { type: 'unknown', version: null, isValid: false, isSpec: false };
  }

  if (typeof parsedContent.openapi === 'string') {
    return { type: 'openapi', version: parsedContent.openapi, isValid: true, isSpec: true };
  }
  if (typeof parsedContent.asyncapi === 'string') {
    return { type: 'asyncapi', version: parsedContent.asyncapi, isValid: true, isSpec: true };
  }
  if (parsedContent.$schema && typeof parsedContent.$schema === 'string') {
    // Basic JSON Schema check. Version detection from $schema URI can be complex.
    // For now, just identify it as json_schema.
    return { type: 'json_schema', version: 'draft_unknown', isValid: true, isSpec: true };
  }

  // If not a specific spec, return generic type based on initial parsing
  // This part is a bit redundant if parseFileContent already determined the structure.
  // The idea is to confirm it's a generic JSON/YAML if no specific spec fields are found.
  // However, the caller of identifySpecFormat will typically know the original extension.

  return { type: 'unknown', version: null, isValid: false, isSpec: false }; // Default if no known spec fields
}

module.exports = {
  getFileExtension,
  parseFileContent,
  identifySpecFormat,
};
