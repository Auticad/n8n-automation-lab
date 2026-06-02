/**
 * Build a Google Sheets row from classification result and workflow state
 * 
 * Requirements 5.1, 5.2
 * 
 * @param {Object} classificationResult - The classification result from Gemini
 * @param {string} classificationResult.category - One of: informational, transactional, error, alert, other
 * @param {number} classificationResult.confidence - Float between 0 and 1
 * @param {string} classificationResult.summary - String, max 200 characters
 * @param {Object} workflowState - The workflow state object
 * @param {string} workflowState.received_at - ISO 8601 timestamp
 * @param {string} workflowState.payload_raw - JSON string of the original payload
 * @param {*} workflowState.truncated - Truncation flag (will be coerced to boolean)
 * @returns {Object} Row object with exactly 6 fields: timestamp, category, confidence, summary, payload_raw, truncated
 */
function buildSheetsRow(classificationResult, workflowState) {
  // Requirement 5.1: Construct row with 6 fields in order
  // timestamp, category, confidence, summary, payload_raw, truncated
  
  // Requirement 5.2: payload_raw limited to 10,000 characters
  let payloadRaw = workflowState.payload_raw || '';
  if (payloadRaw.length > 10000) {
    payloadRaw = payloadRaw.substring(0, 10000);
  }

  // Requirement 5.2: truncated must be boolean (coercion with Boolean())
  const truncated = Boolean(workflowState.truncated);

  return {
    timestamp: workflowState.received_at,
    category: classificationResult.category,
    confidence: classificationResult.confidence,
    summary: classificationResult.summary,
    payload_raw: payloadRaw,
    truncated: truncated
  };
}

module.exports = { buildSheetsRow };
