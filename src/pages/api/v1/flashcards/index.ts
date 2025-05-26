import type { APIRoute } from "astro";
import { CreateFlashcardCommandSchema } from "../../../../lib/validators/flashcard";
import { FlashcardService } from "../../../../lib/services/flashcard.service";
import { developmentConfig } from "../../../../lib/config/development";

// Tymczasowy mock użytkownika (do zastąpienia autoryzacją)
const mockUser = { id: "d5986da6-7831-483d-8728-e3c26592b4a0", email: "mock@example.com" };

/**
 * POST /api/v1/flashcards
 * Endpoint do tworzenia nowej fiszki.
 * Zwraca 201 Created oraz DTO z utworzoną fiszką.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Parse and validate payload
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_JSON",
            message: "Invalid JSON payload",
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const parseResult = CreateFlashcardCommandSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: parseResult.error.flatten(),
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Create flashcard via service
    try {
      const created = await FlashcardService.createFlashcard(
        locals.supabase,
        developmentConfig.mockUser.id, // TODO: Use locals.user.id after adding auth
        parseResult.data
      );
      return new Response(JSON.stringify(created), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          Location: `/api/v1/flashcards/${created.id}`,
        },
      });
    } catch (err) {
      const error = err as Error;
      if (error.message === "Category not found") {
        return new Response(
          JSON.stringify({
            error: {
              code: "CATEGORY_NOT_FOUND",
              message: "Category not found",
            },
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      if (error.message === "Failed to create flashcard") {
        return new Response(
          JSON.stringify({
            error: {
              code: "DATABASE_ERROR",
              message: "Failed to create flashcard in database",
            },
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      throw error; // Re-throw unexpected errors
    }
  } catch (err) {
    console.error("Error creating flashcard:", err);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
