import type { APIRoute } from 'astro';
import { UpdateFlashcardCommandSchema } from '../../../../lib/validators/flashcard';
import { FlashcardService } from '../../../../lib/services/flashcard.service';

// Tymczasowy mock użytkownika (do zastąpienia autoryzacją)
const mockUser = { id: 'd5986da6-7831-483d-8728-e3c26592b4a0', email: 'mock@example.com' };

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Walidacja flashcardId z URL
    const { flashcardId } = params;
    if (!flashcardId || !/^[0-9a-f-]{36}$/.test(flashcardId)) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid flashcard ID format',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Walidacja payloadu
    const body = await request.json();
    const parseResult = UpdateFlashcardCommandSchema.safeParse(body);
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

    // 3. Aktualizacja przez serwis
    try {
      const updated = await FlashcardService.updateFlashcard(
        locals.supabase,
        mockUser.id, // TODO: Użyj locals.user.id po dodaniu autoryzacji
        flashcardId,
        parseResult.data
      );
      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      const error = err as Error;
      if (error.message === 'Flashcard not found') {
        return new Response(
          JSON.stringify({
            error: {
              code: 'NOT_FOUND',
              message: 'Flashcard not found',
            },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (error.message === 'Category not found') {
        return new Response(
          JSON.stringify({
            error: {
              code: 'NOT_FOUND',
              message: 'Category not found',
            },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw error; // Przekaż dalej nieoczekiwane błędy
    }
  } catch (err) {
    console.error('Error updating flashcard:', err);
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