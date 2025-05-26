import type { APIRoute } from 'astro';
import { AcceptGeneratedCardsCommandSchema } from '../../../../../lib/validators/generation';
import { GenerationService } from '../../../../../lib/services/generation.service';

// Tymczasowy mock użytkownika (do zastąpienia autoryzacją)
const mockUser = { id: 'd5986da6-7831-483d-8728-e3c26592b4a0', email: 'mock@example.com' };

/**
 * POST /api/v1/generations/{generationId}/accept
 * Endpoint do akceptacji wygenerowanych fiszek.
 * Zwraca 200 OK oraz listę utworzonych fiszek.
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Walidacja generationId z URL
    const { generationId } = params;
    if (!generationId || !/^[0-9a-f-]{36}$/.test(generationId)) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid generation ID format',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Walidacja payloadu (opcjonalny)
    let commandData;
    if (request.headers.get('Content-Length') !== '0') {
      try {
        const body = await request.json();
        const parseResult = AcceptGeneratedCardsCommandSchema.safeParse(body);
        if (!parseResult.success) {
          return new Response(
            JSON.stringify({
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: parseResult.error.flatten(),
              },
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        commandData = parseResult.data;
      } catch (err) {
        return new Response(
          JSON.stringify({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid JSON payload',
            },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Akceptacja fiszek przez serwis
    try {
      const acceptedFlashcards = await GenerationService.acceptGeneratedCards(
        locals.supabase,
        mockUser.id, // TODO: Użyj locals.user.id po dodaniu autoryzacji
        generationId,
        commandData
      );
      return new Response(JSON.stringify(acceptedFlashcards), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      const error = err as Error;
      if (error.message === 'Generation not found') {
        return new Response(
          JSON.stringify({
            error: {
              code: 'NOT_FOUND',
              message: 'Generation not found',
            },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (error.message === 'Generation already processed') {
        return new Response(
          JSON.stringify({
            error: {
              code: 'CONFLICT',
              message: 'Generation already accepted or cancelled',
            },
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (error.message === 'No flashcards to accept') {
        return new Response(
          JSON.stringify({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'No flashcards to accept',
            },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw error; // Przekaż dalej nieoczekiwane błędy
    }
  } catch (err) {
    console.error('Error accepting flashcards:', err);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}; 