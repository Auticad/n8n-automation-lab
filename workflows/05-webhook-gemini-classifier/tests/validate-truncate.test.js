'use strict';

const fc = require('fast-check');
const { validateAndTruncate } = require('./validate-truncate');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JSON_HEADERS = { 'content-type': 'application/json' };

/**
 * Genera un oggetto JSON la cui serializzazione supera 10.000 caratteri.
 * Costruisce un array di stringhe abbastanza lungo da garantire il superamento.
 */
function buildLargePayload() {
  const obj = {};
  let i = 0;
  while (JSON.stringify(obj).length <= 10000) {
    obj[`key_${i}`] = 'x'.repeat(100);
    i++;
  }
  return obj;
}

// ---------------------------------------------------------------------------
// Test unitari — Task 2.2
// ---------------------------------------------------------------------------

describe('validateAndTruncate — unit tests', () => {
  // Caso 1: payload JSON valido < 10.000 char → truncated: false, payload_raw intatto
  test('payload JSON valido < 10.000 char: truncated false e payload_raw intatto', () => {
    const payload = { event: 'purchase', user_id: 'u123', amount: 49.99 };
    const result = validateAndTruncate(payload, JSON_HEADERS);

    expect(result.statusCode).toBeUndefined();
    expect(result.truncated).toBe(false);
    expect(result.payload_raw).toBe(JSON.stringify(payload));
    expect(JSON.parse(result.payload_raw)).toEqual(payload);
  });

  // Caso 2: payload JSON valido > 10.000 char → truncated: true, payload_raw.length === 10000
  test('payload JSON valido > 10.000 char: truncated true e payload_raw.length === 10000', () => {
    const largePayload = buildLargePayload();
    const result = validateAndTruncate(largePayload, JSON_HEADERS);

    expect(result.statusCode).toBeUndefined();
    expect(result.truncated).toBe(true);
    expect(result.payload_raw.length).toBe(10000);
  });

  // Caso 3: payload vuoto {} → nessun errore, truncated: false
  test('payload vuoto {}: nessun errore e truncated false', () => {
    const result = validateAndTruncate({}, JSON_HEADERS);

    expect(result.statusCode).toBeUndefined();
    expect(result.truncated).toBe(false);
    expect(result.payload_raw).toBe('{}');
  });

  // Caso 4: body non-JSON (stringa) → statusCode: 400, error: "invalid_payload"
  test('body stringa: statusCode 400 e error invalid_payload', () => {
    const result = validateAndTruncate('hello world', JSON_HEADERS);

    expect(result.statusCode).toBe(400);
    expect(result.body.error).toBe('invalid_payload');
  });

  // Caso 4b: body null → statusCode: 400
  test('body null: statusCode 400 e error invalid_payload', () => {
    const result = validateAndTruncate(null, JSON_HEADERS);

    expect(result.statusCode).toBe(400);
    expect(result.body.error).toBe('invalid_payload');
  });

  // Caso 4c: body numero → statusCode: 400
  test('body numero: statusCode 400 e error invalid_payload', () => {
    const result = validateAndTruncate(42, JSON_HEADERS);

    expect(result.statusCode).toBe(400);
    expect(result.body.error).toBe('invalid_payload');
  });

  // Caso 5: Content-Type non application/json → statusCode: 415
  test('Content-Type text/plain: statusCode 415', () => {
    const result = validateAndTruncate({ foo: 'bar' }, { 'content-type': 'text/plain' });

    expect(result.statusCode).toBe(415);
    expect(result.body.error).toBe('unsupported_media_type');
  });

  // Caso 5b: Content-Type assente → statusCode: 415
  test('Content-Type assente: statusCode 415', () => {
    const result = validateAndTruncate({ foo: 'bar' }, {});

    expect(result.statusCode).toBe(415);
    expect(result.body.error).toBe('unsupported_media_type');
  });

  // Caso 5c: Content-Type application/xml → statusCode: 415
  test('Content-Type application/xml: statusCode 415', () => {
    const result = validateAndTruncate({ foo: 'bar' }, { 'content-type': 'application/xml' });

    expect(result.statusCode).toBe(415);
    expect(result.body.error).toBe('unsupported_media_type');
  });

  // Caso 6: received_at aggiunto e ISO 8601 valido
  test('received_at presente e ISO 8601 valido', () => {
    const result = validateAndTruncate({ a: 1 }, JSON_HEADERS);

    expect(result.received_at).toBeDefined();
    // Non deve lanciare eccezione
    expect(() => new Date(result.received_at).toISOString()).not.toThrow();
    // Deve essere una data valida (non NaN)
    expect(isNaN(new Date(result.received_at).getTime())).toBe(false);
  });

  // Verifica shape completa output happy path
  test('output happy path contiene tutti i campi attesi', () => {
    const payload = { x: 1 };
    const result = validateAndTruncate(payload, JSON_HEADERS);

    expect(result).toHaveProperty('payload');
    expect(result).toHaveProperty('payload_raw');
    expect(result).toHaveProperty('received_at');
    expect(result).toHaveProperty('retry_count', 0);
    expect(result).toHaveProperty('truncated');
  });
});

// ---------------------------------------------------------------------------
// Property 1: Payload JSON valido passato invariato — Task 2.3
// Validates: Requirements 1.2, 2.1
// ---------------------------------------------------------------------------

/**
 * Verifica ricorsivamente se un valore contiene undefined.
 * JSON.stringify converte undefined → null, quindi oggetti con undefined
 * non producono un round-trip perfetto — è comportamento corretto di JSON.
 */
function containsUndefined(value) {
  if (value === undefined) return true;
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsUndefined);
  return Object.values(value).some(containsUndefined);
}

describe('Property 1: payload JSON valido passato invariato', () => {
  // Feature: webhook-gemini-classifier, Property 1: payload JSON valido passato invariato
  test('qualsiasi oggetto JSON valido viene passato senza modifiche semantiche', () => {
    fc.assert(
      fc.property(
        // Filtra oggetti con undefined: non sono JSON-serializzabili senza perdita
        fc.object().filter((o) => !containsUndefined(o)),
        (payload) => {
          const result = validateAndTruncate(payload, JSON_HEADERS);

          // Non deve essere un errore
          expect(result.statusCode).toBeUndefined();

          // Per payload non troncati: round-trip fedele
          if (!result.truncated) {
            expect(JSON.parse(result.payload_raw)).toEqual(payload);
          }

          // Il campo payload deve sempre essere l'oggetto originale
          expect(result.payload).toEqual(payload);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Payload non-JSON → sempre 400 — Task 2.4
// Validates: Requirements 1.3, 2.2
// ---------------------------------------------------------------------------

describe('Property 2: payload non-JSON produce sempre HTTP 400', () => {
  // Feature: webhook-gemini-classifier, Property 2: payload non-JSON produce sempre 400
  test('qualsiasi stringa produce errore 400 con error invalid_payload', () => {
    fc.assert(
      fc.property(fc.string(), (invalidBody) => {
        const result = validateAndTruncate(invalidBody, JSON_HEADERS);

        expect(result.statusCode).toBe(400);
        expect(result.body.error).toBe('invalid_payload');
      }),
      { numRuns: 100 }
    );
  });

  test('body null produce sempre 400', () => {
    fc.assert(
      fc.property(fc.constant(null), (body) => {
        const result = validateAndTruncate(body, JSON_HEADERS);
        expect(result.statusCode).toBe(400);
        expect(result.body.error).toBe('invalid_payload');
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Content-Type non JSON → sempre 415 — Task 2.5
// Validates: Requirements 1.6
// ---------------------------------------------------------------------------

describe('Property 3: Content-Type non JSON produce sempre HTTP 415', () => {
  // Feature: webhook-gemini-classifier, Property 3: Content-Type non JSON produce sempre 415
  test('qualsiasi content-type diverso da application/json produce 415', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.includes('application/json')),
        (contentType) => {
          const result = validateAndTruncate({ foo: 'bar' }, { 'content-type': contentType });

          expect(result.statusCode).toBe(415);
          expect(result.body.error).toBe('unsupported_media_type');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('header content-type assente produce 415', () => {
    fc.assert(
      fc.property(fc.object(), (payload) => {
        const result = validateAndTruncate(payload, {});
        expect(result.statusCode).toBe(415);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Troncamento a 10.000 char e truncated riflette la realtà — Task 2.6
// Validates: Requirements 2.4, 2.5
// ---------------------------------------------------------------------------

describe('Property 4: payload_raw non supera 10.000 char e truncated è corretto', () => {
  // Feature: webhook-gemini-classifier, Property 4: payload grande troncato e truncated riflette realtà
  test('payload_raw.length <= 10000 per qualsiasi payload JSON', () => {
    fc.assert(
      fc.property(fc.object(), (payload) => {
        const result = validateAndTruncate(payload, JSON_HEADERS);

        // Nessun errore
        expect(result.statusCode).toBeUndefined();

        // Lunghezza rispettata
        expect(result.payload_raw.length).toBeLessThanOrEqual(10000);

        // truncated riflette la realtà dell'input originale
        const originalLength = JSON.stringify(payload).length;
        expect(result.truncated).toBe(originalLength > 10000);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: received_at sempre ISO 8601 — Task 2.7
// Validates: Requirements 2.6
// ---------------------------------------------------------------------------

describe('Property 5: received_at sempre presente e ISO 8601 valido', () => {
  // Feature: webhook-gemini-classifier, Property 5: received_at sempre ISO 8601 valido
  test('received_at è definito e parsabile come ISO 8601 per qualsiasi payload', () => {
    fc.assert(
      fc.property(fc.object(), (payload) => {
        const result = validateAndTruncate(payload, JSON_HEADERS);

        // Nessun errore
        expect(result.statusCode).toBeUndefined();

        // received_at presente
        expect(result.received_at).toBeDefined();
        expect(result.received_at).not.toBeNull();

        // Parsabile come ISO 8601 senza lanciare
        expect(() => new Date(result.received_at).toISOString()).not.toThrow();

        // Data valida (non NaN)
        expect(isNaN(new Date(result.received_at).getTime())).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
