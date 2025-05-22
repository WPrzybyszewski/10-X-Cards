import type { APIRoute } from 'astro';
import { PaginationSchema } from '../../../../lib/validators/pagination';
import { GenerationService } from '../../../../lib/services/generation.service';
import { SubmitGenerationCommandSchema } from '../../../../lib/validators/generation';

// Tymczasowy mock użytkownika (do zastąpienia autoryzacją)
const mockUser = { id: 'mock-user-id', email: 'mock@example.com' };

// Tymczasowa mockowa lista kategorii użytkownika
const mockCategories = [
  { id: '11111111-1111-1111-1111-111111111111', userId: mockUser.id, name: 'Default' },
];

const DEFAULT_MODEL = 'openrouter/opus-mixtral-8x22b';

/**
 * GET /api/v1/generations
 * Endpoint do pobierania listy zadań generacji fiszek.
 * Zwraca listę zadań z paginacją.
 *
 * Wersja mockowa – bez realnej bazy i autoryzacji.
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    // 1. (Mock) Autoryzacja
    // Wersja produkcyjna: pobierz usera z context.locals, sprawdź JWT

    // 2. Walidacja parametrów paginacji
    const searchParams = Object.fromEntries(url.searchParams);
    const parseResult = PaginationSchema.safeParse(searchParams);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: '400',
            message: 'Invalid pagination parameters',
            details: parseResult.error.flatten(),
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Pobranie listy zadań przez serwis
    try {
      const result = await GenerationService.getList(mockUser.id, parseResult.data);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      // Błąd serwera podczas pobierania danych
      console.error('Error fetching generations:', err);
      return new Response(
        JSON.stringify({
          error: { code: '500', message: 'Internal server error' },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    // Nieoczekiwany błąd
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({
        error: { code: '500', message: 'Internal server error' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * POST /api/v1/generations
 * Endpoint do zgłaszania zadania generowania fiszek przez AI.
 * Zwraca 202 Accepted oraz DTO z id i statusem zadania.
 */
export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const parseResult = SubmitGenerationCommandSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: { code: '400', message: 'Validation failed', details: parseResult.error.flatten() } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const { categoryId, model, sourceText } = parseResult.data;
    if (categoryId) {
      const found = mockCategories.find((cat) => cat.id === categoryId && cat.userId === mockUser.id);
      if (!found) {
        return new Response(
          JSON.stringify({ error: { code: '404', message: 'Category not found' } }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    // Mock tworzenia rekordu generations
    let generation;
    try {
      generation = await GenerationService.create({
        userId: mockUser.id,
        sourceText,
        model: model || DEFAULT_MODEL,
        categoryId,
      });
      await GenerationService.enqueueGeneration(generation.id);
    } catch (err) {
      await GenerationService.logError(generation?.id || 'unknown', err);
      return new Response(
        JSON.stringify({ error: { code: '500', message: 'Internal server error' } }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    // Odpowiedź 202 + Location
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
    return new Response(
      JSON.stringify({ error: { code: '400', message: 'Invalid JSON' } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}; 