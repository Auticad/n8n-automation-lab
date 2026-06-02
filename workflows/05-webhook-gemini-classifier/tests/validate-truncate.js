/**
 * Validate and truncate incoming webhook payload
 * 
 * @param {*} body - The parsed body from the webhook request
 * @param {Object} headers - The HTTP headers object (lowercase keys)
 * @returns {Object} Validated and enriched payload, or error object
 */
function validateAndTruncate(body, headers) {
  // Requirement 1.6: Check Content-Type header
  const contentType = headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    return {
      statusCode: 415,
      body: {
        error: 'unsupported_media_type'
      }
    };
  }

  // Requirement 2.2: Validate body is a valid JSON object (not null, not string)
  if (body === null || body === undefined) {
    return {
      statusCode: 400,
      body: {
        error: 'invalid_payload',
        detail: 'Body is null or undefined'
      }
    };
  }

  if (typeof body === 'string') {
    return {
      statusCode: 400,
      body: {
        error: 'invalid_payload',
        detail: 'Body is a string, not an object'
      }
    };
  }

  if (typeof body !== 'object') {
    return {
      statusCode: 400,
      body: {
        error: 'invalid_payload',
        detail: `Body is ${typeof body}, not an object`
      }
    };
  }

  // Requirement 2.4, 2.5: Serialize and check length
  let payloadRaw = JSON.stringify(body);
  let truncated = false;

  if (payloadRaw.length > 10000) {
    payloadRaw = payloadRaw.substring(0, 10000);
    truncated = true;
  }

  // Requirement 2.6: Add received_at timestamp (ISO 8601 UTC)
  const receivedAt = new Date().toISOString();

  // Return enriched payload
  return {
    payload: body,
    payload_raw: payloadRaw,
    received_at: receivedAt,
    retry_count: 0,
    truncated: truncated
  };
}

module.exports = { validateAndTruncate };
