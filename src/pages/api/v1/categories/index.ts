import type { APIRoute } from 'astro';
import { CreateCategoryCommandSchema } from '../../../../lib/validators/category';
import { CategoryService } from '../../../../lib/services/category.service';

// Tymczasowy mock użytkownika (do zastąpienia autoryzacją)
const mockUser = { id: 'd5986da6-7831-483d-8728-e3c26592b4a0', email: 'mock@example.com' };

/**
 * POST /api/v1/categories
 * Endpoint do tworzenia nowej kategorii.
 * Zwraca 201 Created oraz DTO z utworzoną kategorią.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Walidacja payloadu
    const body = await request.json();
    const parseResult = CreateCategoryCommandSchema.safeParse(body);
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

    // 2. Tworzenie kategorii przez serwis
    try {
      const created = await CategoryService.createCategory(
        locals.supabase,
        mockUser.id, // TODO: Użyj locals.user.id po dodaniu autoryzacji
        parseResult.data
      );
      return new Response(JSON.stringify(created), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Location': `/api/v1/categories/${created.id}`,
        },
      });
    } catch (err) {
      const error = err as Error;
      if (error.message === 'Category with this name already exists') {
        return new Response(
          JSON.stringify({
            error: {
              code: 'CONFLICT',
              message: 'Category with this name already exists',
            },
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw error; // Przekaż dalej nieoczekiwane błędy
    }
  } catch (err) {
    console.error('Error creating category:', err);
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