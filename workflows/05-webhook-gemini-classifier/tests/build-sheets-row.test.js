'use strict';

/**
 * Test suite — Build Sheets Row
 * Feature: webhook-gemini-classifier
 *
 * Copertura:
 *   - Task 6.2: test unitari (tutti i campi, tipi, troncamento, timestamp)
 *   - Task 6.3: property-based test con fast-check (Property 8, 100 iterazioni)
 */

const fc = require('fast-check');
const { buildSheetsRow } = require('./build-sheets-row');

// ---------------------------------------------------------------------------
// Costanti condivise
// ---------------------------------------------------------------------------
const VALID_CATEGORIES = ['informational', 'transactional', 'error', 'alert', 'other'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Costruisce un workflowState valido con payload_raw da un oggetto.
 */
function makeWorkflowState(payloadObj, overrides = {}) {
  const payloadRaw = JSON.stringify(payloadObj);
  const truncated = payloadRaw.length > 10000;
  return {
    received_at: new Date().toISOString(),
    payload_raw: truncated ? payloadRaw.substring(0, 10000) : payloadRaw,
    truncated,
    ...overrides
  };
}

/**
 * Costruisce una stringa payload_raw che supera 10.000 caratteri.
 */
function buildLargePayloadRaw() {
  return 'x'.repeat(12000);
}

// ---------------------------------------------------------------------------
// Task 6.2 — Test unitari
// ---------------------------------------------------------------------------
describe('buildSheetsRow — test unitari (Task 6.2)', () => {

  // -------------------------------------------------------------------------
  // Caso 1: tutti i campi presenti con tipi corretti
  // -------------------------------------------------------------------------
  test('restituisce un oggetto con esattamente 6 campi di tipo corretto', () => {
    const classResult = { category: 'transactional', confidence: 0.92, summary: 'Acquisto utente u123.' };
    const workflowState = makeWorkflowState({ event: 'purchase', user_id: 'u123' });

    const row = buildSheetsRow(classResult, workflowState);

    // Tutti e 6 i campi presenti
    expect(row).toHaveProperty('timestamp');
    expect(row).toHaveProperty('category');
    expect(row).toHaveProperty('confidence');
    expect(row).toHaveProperty('summary');
    expect(row).toHaveProperty('payload_raw');
    expect(row).toHaveProperty('truncated');

    // Tipi corretti
    expect(typeof row.timestamp).toBe('string');
    expect(typeof row.category).toBe('string');
    expect(typeof row.confidence).toBe('number');
    expect(typeof row.summary).toBe('string');
    expect(typeof row.payload_raw).toBe('string');
    expect(typeof row.truncated).toBe('boolean');

    // Valori corretti
    expect(row.timestamp).toBe(workflowState.received_at);
    expect(row.category).toBe(classResult.category);
    expect(row.confidence).toBe(classResult.confidence);
    expect(row.summary).toBe(classResult.summary);
  });

  // -------------------------------------------------------------------------
  // Caso 2: truncated è sempre boolean — anche quando workflowState.truncated
  //         è un valore truthy/falsy non-booleano
  // -------------------------------------------------------------------------
  test('truncated è boolean anche se workflowState.truncated è un valore truthy non-booleano', () => {
    const classResult = { category: 'alert', confidence: 0.7, summary: 'Test.' };

    // Truthy non-booleano
    const stateWithTruthyTruncated = makeWorkflowState({}, { truncated: 1 });
    const row1 = buildSheetsRow(classResult, stateWithTruthyTruncated);
    expect(typeof row1.truncated).toBe('boolean');
    expect(row1.truncated).toBe(true);

    // Falsy non-booleano
    const stateWithFalsyTruncated = makeWorkflowState({}, { truncated: 0 });
    const row2 = buildSheetsRow(classResult, stateWithFalsyTruncated);
    expect(typeof row2.truncated).toBe('boolean');
    expect(row2.truncated).toBe(false);

    // Undefined → false
    const stateWithUndefinedTruncated = makeWorkflowState({});
    delete stateWithUndefinedTruncated.truncated;
    const row3 = buildSheetsRow(classResult, stateWithUndefinedTruncated);
    expect(typeof row3.truncated).toBe('boolean');
    expect(row3.truncated).toBe(false);
  });

  test('truncated è boolean quando workflowState.truncated è già true', () => {
    const classResult = { category: 'error', confidence: 0.5, summary: 'Errore.' };
    const state = makeWorkflowState({}, { truncated: true, received_at: new Date().toISOString(), payload_raw: 'x'.repeat(100) });

    const row = buildSheetsRow(classResult, state);
    expect(typeof row.truncated).toBe('boolean');
    expect(row.truncated).toBe(true);
  });

  test('truncated è boolean quando workflowState.truncated è false', () => {
    const classResult = { category: 'other', confidence: 0.3, summary: 'Altro.' };
    const state = makeWorkflowState({ key: 'value' });

    const row = buildSheetsRow(classResult, state);
    expect(typeof row.truncated).toBe('boolean');
    expect(row.truncated).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Caso 3: confidence è sempre number
  // -------------------------------------------------------------------------
  test('confidence è number per tutti i valori float validi [0,1]', () => {
    const values = [0, 0.0, 0.5, 0.99, 1, 1.0];
    const state = makeWorkflowState({ a: 1 });

    for (const conf of values) {
      const classResult = { category: 'informational', confidence: conf, summary: 'Test.' };
      const row = buildSheetsRow(classResult, state);
      expect(typeof row.confidence).toBe('number');
      expect(row.confidence).toBe(conf);
    }
  });

  // -------------------------------------------------------------------------
  // Caso 4: payload_raw viene troncato a 10.000 char se supera tale lunghezza
  // -------------------------------------------------------------------------
  test('payload_raw viene troncato a 10.000 caratteri se supera il limite', () => {
    const classResult = { category: 'informational', confidence: 0.8, summary: 'Large payload.' };
    const state = {
      received_at: new Date().toISOString(),
      payload_raw: buildLargePayloadRaw(), // 12.000 char
      truncated: true
    };

    const row = buildSheetsRow(classResult, state);

    expect(row.payload_raw.length).toBe(10000);
  });

  test('payload_raw non viene modificato se è già <= 10.000 caratteri', () => {
    const classResult = { category: 'transactional', confidence: 0.95, summary: 'Piccolo payload.' };
    const originalRaw = JSON.stringify({ event: 'click', user: 'u42' });
    const state = {
      received_at: new Date().toISOString(),
      payload_raw: originalRaw,
      truncated: false
    };

    const row = buildSheetsRow(classResult, state);

    expect(row.payload_raw).toBe(originalRaw);
    expect(row.payload_raw.length).toBeLessThanOrEqual(10000);
  });

  test('payload_raw di esattamente 10.000 caratteri non viene modificato', () => {
    const classResult = { category: 'other', confidence: 0.6, summary: 'Boundary test.' };
    const exactRaw = 'a'.repeat(10000);
    const state = {
      received_at: new Date().toISOString(),
      payload_raw: exactRaw,
      truncated: false
    };

    const row = buildSheetsRow(classResult, state);

    expect(row.payload_raw.length).toBe(10000);
    expect(row.payload_raw).toBe(exactRaw);
  });

  // -------------------------------------------------------------------------
  // Caso 5: timestamp corrisponde a received_at del workflowState
  // -------------------------------------------------------------------------
  test('timestamp corrisponde esattamente a workflowState.received_at', () => {
    const receivedAt = '2025-01-15T10:30:00.000Z';
    const classResult = { category: 'alert', confidence: 0.88, summary: 'Evento critico.' };
    const state = {
      received_at: receivedAt,
      payload_raw: '{"level":"error"}',
      truncated: false
    };

    const row = buildSheetsRow(classResult, state);

    expect(row.timestamp).toBe(receivedAt);
  });

  test('timestamp preserva il valore ISO 8601 esatto di received_at', () => {
    const timestamps = [
      '2025-01-01T00:00:00.000Z',
      '2024-12-31T23:59:59.999Z',
      '2025-06-15T14:22:33.456Z'
    ];

    for (const ts of timestamps) {
      const state = { received_at: ts, payload_raw: '{}', truncated: false };
      const classResult = { category: 'informational', confidence: 0.5, summary: 'Test.' };
      const row = buildSheetsRow(classResult, state);
      expect(row.timestamp).toBe(ts);
    }
  });

  // -------------------------------------------------------------------------
  // Nessun campo extra: la riga ha esattamente 6 chiavi
  // -------------------------------------------------------------------------
  test('la riga contiene esattamente 6 chiavi, senza campi extra', () => {
    const classResult = { category: 'transactional', confidence: 0.75, summary: 'Test.' };
    const state = makeWorkflowState({ x: 1 });

    const row = buildSheetsRow(classResult, state);

    expect(Object.keys(row)).toHaveLength(6);
    expect(Object.keys(row).sort()).toEqual(
      ['category', 'confidence', 'payload_raw', 'summary', 'timestamp', 'truncated'].sort()
    );
  });

});

// ---------------------------------------------------------------------------
// Task 6.3 — Property-based tests (Property 8)
// Feature: webhook-gemini-classifier, Property 8: Happy path — riga Sheets sempre completa e corretta
// Validates: Requirements 5.1, 5.2, 5.5
// ---------------------------------------------------------------------------
describe('buildSheetsRow — property-based tests (Task 6.3)', () => {

  // Feature: webhook-gemini-classifier, Property 8: riga Sheets contiene sempre i 6 campi con tipi corretti
  test(
    'Property 8 — qualsiasi Classification_Result valido produce una riga Sheets completa e corretta',
    () => {
      fc.assert(
        fc.property(
          // Classification result valido
          fc.record({
            category: fc.constantFrom(...VALID_CATEGORIES),
            confidence: fc.float({ min: 0, max: 1, noNaN: true }).filter(
              n => isFinite(n) && n >= 0 && n <= 1
            ),
            summary: fc.string({ maxLength: 200 })
          }),
          // Payload originale arbitrario
          fc.object(),
          // received_at come stringa ISO
          fc.string(),
          (classResult, originalPayload, receivedAt) => {
            const payloadRaw = JSON.stringify(originalPayload);
            const truncated = payloadRaw.length > 10000;

            const workflowState = {
              received_at: receivedAt,
              payload_raw: truncated ? payloadRaw.substring(0, 10000) : payloadRaw,
              truncated
            };

            const row = buildSheetsRow(classResult, workflowState);

            // 1. La riga ha tutti e 6 i campi
            expect(row).toHaveProperty('timestamp');
            expect(row).toHaveProperty('category');
            expect(row).toHaveProperty('confidence');
            expect(row).toHaveProperty('summary');
            expect(row).toHaveProperty('payload_raw');
            expect(row).toHaveProperty('truncated');

            // 2. truncated è sempre boolean
            expect(typeof row.truncated).toBe('boolean');

            // 3. confidence è sempre number
            expect(typeof row.confidence).toBe('number');

            // 4. payload_raw non supera mai 10.000 caratteri
            expect(row.payload_raw.length).toBeLessThanOrEqual(10000);

            // 5. timestamp corrisponde a received_at
            expect(row.timestamp).toBe(workflowState.received_at);

            // 6. category e summary corrispondono al Classification_Result
            expect(row.category).toBe(classResult.category);
            expect(row.summary).toBe(classResult.summary);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

});
