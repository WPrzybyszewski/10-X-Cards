import type { APIRoute } from 'astro';
import { SubmitGenerationCommandSchema } from '../../../lib/validators/generation';
import { GenerationService } from '../../../lib/services/generation.service';

// Tymczasowy mock użytkownika (do zastąpienia autoryzacją)
const mockUser = { id: 'mock-user-id', email: 'mock@example.com' };

// Tymczasowa mockowa lista kategorii użytkownika
const mockCategories = [
  { id: '11111111-1111-1111-1111-111111111111', userId: mockUser.id, name: 'Default' },
];

// Mock funkcji generującej UUID
function mockUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Mock pobrania modelu z env
const DEFAULT_MODEL = 'openrouter/opus-mixtral-8x22b';

// Mock enqueue
function mockEnqueueGeneration(id: string) {
  // Tu normalnie byłoby wywołanie serwisu/kolejki
  return true;
}

/**
 * SCENARIUSZE TESTOWE I EDGE CASE’Y DLA ENDPOINTU POST /api/v1/generations
 *
 * 1. Poprawne żądanie (wszystkie pola, poprawny categoryId) → 202, DTO, Location
 * 2. Poprawne żądanie (bez categoryId) → 202, DTO, Location
 * 3. Brak wymaganych pól (np. brak sourceText) → 400 Validation failed
 * 4. Za krótki/za długi sourceText (<1000 lub >10000 znaków) → 400 Validation failed
 * 5. Nieprawidłowy format categoryId (nie-UUID) → 400 Validation failed
 * 6. Nieistniejący categoryId → 404 Category not found
 * 7. categoryId należy do innego użytkownika → 404 Category not found
 * 8. Nieprawidłowy JSON w body → 400 Invalid JSON
 * 9. Błąd serwera podczas tworzenia rekordu/queue → 500 Internal server error
 * 10. Brak autoryzacji (w wersji produkcyjnej) → 401 Unauthorized
 * 11. Przekroczenie limitu rozmiaru payloadu (middleware) → 413 Payload Too Large
 * 12. Przekroczenie rate limitu (middleware) → 429 Too Many Requests
 * 13. Nieprawidłowy model (jeśli walidacja modeli) → 400 Validation failed
 */

/**
 * POST /api/v1/generations
 * Endpoint do zgłaszania zadania generowania fiszek przez AI.
 * Zwraca 202 Accepted oraz DTO z id i statusem zadania.
 * Logika generowania jest asynchroniczna (enqueue do kolejki).
 *
 * Wersja mockowa – bez realnej bazy i autoryzacji.
 */
export const POST: APIRoute = async (context) => {
  try {
    // 1. Parsowanie i walidacja danych wejściowych (Zod)
    const body = await context.request.json();
    const parseResult = SubmitGenerationCommandSchema.safeParse(body);
    if (!parseResult.success) {
      // Walidacja nie powiodła się – 400
      return new Response(
        JSON.stringify({ error: { code: '400', message: 'Validation failed', details: parseResult.error.flatten() } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const { categoryId, model, sourceText } = parseResult.data;

    // 2. (Mock) Autoryzacja i walidacja kategorii
    // Wersja produkcyjna: pobierz usera z context.locals, sprawdź JWT
    if (categoryId) {
      const found = mockCategories.find((cat) => cat.id === categoryId && cat.userId === mockUser.id);
      if (!found) {
        // Kategoria nie istnieje lub nie należy do użytkownika – 404
        return new Response(
          JSON.stringify({ error: { code: '404', message: 'Category not found' } }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Tworzenie rekordu generations i enqueue (mock przez serwis)
    let generation;
    try {
      generation = await GenerationService.create({
        userId: mockUser.id, // Wersja produkcyjna: userId z autoryzacji
        sourceText,
        model: model || DEFAULT_MODEL,
        categoryId,
      });
      await GenerationService.enqueueGeneration(generation.id);
    } catch (err) {
      // Błąd serwera lub kolejki – logowanie i 500
      await GenerationService.logError(generation?.id || 'unknown', err);
      return new Response(
        JSON.stringify({ error: { code: '500', message: 'Internal server error' } }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Odpowiedź 202 Accepted + Location (link do statusu zadania)
    return new Response(
      JSON.stringify({ id: generation.id, status: generation.status, createdAt: generation.createdAt, updatedAt: generation.updatedAt, modelUsed: generation.modelUsed }),
      {
        status: 202,
        headers: {
          'Content-Type': 'application/json',
          Location: `/api/v1/generations/${generation.id}`,
        },
      }
    );
  } catch (err) {
    // Błąd parsowania JSON lub inne – 400
    return new Response(
      JSON.stringify({ error: { code: '400', message: 'Invalid JSON' } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}; 