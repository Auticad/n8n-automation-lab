/**
 * Parse and validate the raw text response returned by Gemini.
 *
 * Requirements: 3.2, 3.3, 3.4
 *
 * @param {string} rawText - The raw text string produced by Gemini
 * @returns {Object} Classification_Result { category, confidence, summary }
 *                   or error object { error: true, error_type: "parse_error", original: rawText }
 */
function parseGeminiResponse(rawText) {
  const VALID_CATEGORIES = ['informational', 'transactional', 'error', 'alert', 'other'];

  // Requirement 3.3: Attempt JSON.parse on the raw Gemini text
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (_) {
    return {
      error: true,
      error_type: 'parse_error',
      original: rawText
    };
  }

  // After parsing we need a plain object (not null, not array)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      error: true,
      error_type: 'parse_error',
      original: rawText
    };
  }

  const { category, confidence, summary } = parsed;

  // Requirement 3.2: Validate category — must be one of the five allowed values
  if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category)) {
    return {
      error: true,
      error_type: 'parse_error',
      original: rawText
    };
  }

  // Requirement 3.2: Validate confidence — must be a number in [0, 1]
  if (
    typeof confidence !== 'number' ||
    !isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    return {
      error: true,
      error_type: 'parse_error',
      original: rawText
    };
  }

  // Requirement 3.2: Validate summary — must be a string of at most 200 characters
  if (typeof summary !== 'string' || summary.length > 200) {
    return {
      error: true,
      error_type: 'parse_error',
      original: rawText
    };
  }

  // Requirement 3.3: All fields valid — return Classification_Result
  return { category, confidence, summary };
}

module.exports = { parseGeminiResponse };
