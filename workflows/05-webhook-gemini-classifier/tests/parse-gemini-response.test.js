'use strict';

/**
 * Test suite — Code node: Parse Classification Result
 * Feature: webhook-gemini-classifier
 *
 * Copertura:
 *   - Task 4.2: test unitari (6 casi)
 *   - Task 4.3: property-based test con fast-check (Property 6a + 6b, 100 iterazioni ciascuna)
 */

const fc = require('fast-check');
const { parseGeminiResponse } = require('./parse-gemini-response');

// ---------------------------------------------------------------------------
// Costanti condivise
// ---------------------------------------------------------------------------
const VALID_CATEGORIES = ['informational', 'transactional', 'error', 'alert', 'other'];

// ---------------------------------------------------------------------------
// Task 4.2 — Test unitari
// ---------------------------------------------------------------------------
describe('parseGeminiResponse — test unitari (Task 4.2)', () => {

  // -------------------------------------------------------------------------
  // Caso 1: JSON valido completo → Classification_Result identico all'input
  // -------------------------------------------------------------------------
  test('JSON valido completo restituisce un Classification_Result identico all\'input', () => {
    const input = { category: 'alert', confidence: 0.9, summary: 'Evento critico rilevato.' };
    const result = parseGeminiResponse(JSON.stringify(input));

    expect(result).not.toHaveProperty('error');
    expect(result.category).toBe(input.category);
    expect(result.confidence).toBe(input.confidence);
    expect(result.summary).toBe(input.summary);
  });

  // -------------------------------------------------------------------------
  // Caso 2: summary > 200 caratteri → branch parse_error
  // -------------------------------------------------------------------------
  test('summary di 201 caratteri produce parse_error', () => {
    const input = {
      category: 'informational',
      confidence: 0.5,
      summary: 'A'.repeat(201)
    };
    const result = parseGeminiResponse(JSON.stringify(input));

    expect(result.error).toBe(true);
    expect(result.error_type).toBe('parse_error');
  });

  // -------------------------------------------------------------------------
  // Caso 3: confidence fuori range (1.5) → branch parse_error
  // -------------------------------------------------------------------------
  test('confidence 1.5 (fuori range [0,1]) produce parse_error', () => {
    const input = { category: 'transactional', confidence: 1.5, summary: 'test' };
    const result = parseGeminiResponse(JSON.stringify(input));

    expect(result.error).toBe(true);
    expect(result.error_type).toBe('parse_error');
  });

  // -------------------------------------------------------------------------
  // Caso 4: category non valida ("spam") → branch parse_error
  // -------------------------------------------------------------------------
  test('category "spam" (non nell\'enum) produce parse_error', () => {
    const input = { category: 'spam', confidence: 0.8, summary: 'test' };
    const result = parseGeminiResponse(JSON.stringify(input));

    expect(result.error).toBe(true);
    expect(result.error_type).toBe('parse_error');
  });

  // -------------------------------------------------------------------------
  // Caso 5: risposta non-JSON ("Sorry, I can't help") → branch parse_error
  // -------------------------------------------------------------------------
  test('risposta non-JSON produce parse_error e preserva il testo originale', () => {
    const rawText = "Sorry, I can't help with that request.";
    const result = parseGeminiResponse(rawText);

    expect(result.error).toBe(true);
    expect(result.error_type).toBe('parse_error');
    expect(result.original).toBe(rawText);
  });

  // -------------------------------------------------------------------------
  // Caso 6: JSON con campi mancanti ({ "category": "alert" }) → parse_error
  // -------------------------------------------------------------------------
  test('JSON con campi mancanti (solo category) produce parse_error', () => {
    const input = { category: 'alert' };
    const result = parseGeminiResponse(JSON.stringify(input));

    expect(result.error).toBe(true);
    expect(result.error_type).toBe('parse_error');
  });

});

// ---------------------------------------------------------------------------
// Task 4.3 — Property-based tests (Property 6)
// Feature: webhook-gemini-classifier, Property 6: parsing risposta Gemini è round-trip fedele
// Validates: Requirements 3.3, 3.4
// ---------------------------------------------------------------------------
describe('parseGeminiResponse — property-based tests (Task 4.3)', () => {

  // -------------------------------------------------------------------------
  // Property 6a: risposta Gemini valida → Classification_Result uguale all'input
  // -------------------------------------------------------------------------
  test(
    // Feature: webhook-gemini-classifier, Property 6a: JSON valido è round-trip fedele
    'Property 6a — qualsiasi risposta Gemini valida produce un Classification_Result identico all\'input',
    () => {
      fc.assert(
        fc.property(
          fc.record({
            category: fc.constantFrom(...VALID_CATEGORIES),
            // fast-check v3: fc.float può generare NaN — filtriamo i valori non finiti
            confidence: fc.float({ min: 0, max: 1, noNaN: true }).filter(
              n => isFinite(n) && n >= 0 && n <= 1
            ),
            summary: fc.string({ maxLength: 200 })
          }),
          (mockResponse) => {
            const result = parseGeminiResponse(JSON.stringify(mockResponse));

            // Nessun flag di errore
            expect(result.error).toBeUndefined();

            // I tre campi devono corrispondere esattamente all'input
            expect(result.category).toBe(mockResponse.category);
            expect(result.confidence).toBe(mockResponse.confidence);
            expect(result.summary).toBe(mockResponse.summary);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // -------------------------------------------------------------------------
  // Property 6b: stringa non-JSON → error === true e error_type === "parse_error"
  // -------------------------------------------------------------------------
  test(
    // Feature: webhook-gemini-classifier, Property 6b: stringa non-JSON produce sempre parse_error
    'Property 6b — qualsiasi stringa non parsabile come JSON produce error === true e error_type "parse_error"',
    () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => {
            try {
              JSON.parse(s);
              return false; // stringa parsabile → escludi
            } catch {
              return true;  // non parsabile → includi
            }
          }),
          (invalidText) => {
            const result = parseGeminiResponse(invalidText);

            expect(result.error).toBe(true);
            expect(result.error_type).toBe('parse_error');
          }
        ),
        { numRuns: 100 }
      );
    }
  );

});
