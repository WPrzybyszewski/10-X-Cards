import type { FlashcardDTO } from "../../types";
import type { CreateFlashcardCommand, UpdateFlashcardCommand } from "../validators/flashcard";
import type { SupabaseClient } from "@supabase/supabase-js";

export class FlashcardService {
  /**
   * Tworzy nową fiszkę dla użytkownika.
   * @throws {Error} Gdy kategoria nie istnieje lub nie należy do użytkownika
   */
  static async createFlashcard(
    supabase: SupabaseClient,
    userId: string,
    data: CreateFlashcardCommand
  ): Promise<FlashcardDTO> {
    // 1. Sprawdź kategorię (jeśli podana)
    if (data.categoryId) {
      const { data: category, error: categoryError } = await supabase
        .from("categories")
        .select("id")
        .eq("id", data.categoryId)
        .eq("user_id", userId)
        .single();

      if (categoryError) {
        throw new Error("Category not found");
      }
    }

    // 2. Utwórz fiszkę
    const { data: created, error: createError } = await supabase
      .from("flashcards")
      .insert({
        user_id: userId,
        question: data.question,
        answer: data.answer,
        category_id: data.categoryId,
        source: "manual",
        generation_id: null,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating flashcard:", createError);
      throw new Error("Failed to create flashcard");
    }

    // 3. Mapuj na DTO
    return {
      id: created.id,
      question: created.question,
      answer: created.answer,
      categoryId: created.category_id,
      generationId: created.generation_id,
      source: created.source,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    };
  }

  /**
   * Aktualizuje fiszkę użytkownika.
   * @throws {Error} Gdy fiszka nie istnieje lub nie należy do użytkownika
   * @throws {Error} Gdy kategoria nie istnieje lub nie należy do użytkownika
   */
  static async updateFlashcard(
    supabase: SupabaseClient,
    userId: string,
    flashcardId: string,
    data: UpdateFlashcardCommand
  ): Promise<FlashcardDTO> {
    console.log("Updating flashcard:", { userId, flashcardId, data });

    // 1. Sprawdź czy fiszka istnieje i należy do użytkownika
    const { data: flashcard, error: findError } = await supabase
      .from("flashcards")
      .select("*")
      .eq("id", flashcardId)
      .single();

    console.log("Find flashcard result:", { flashcard, error: findError });

    if (findError || !flashcard) {
      console.error("Flashcard not found:", findError);
      throw new Error("Flashcard not found");
    }

    // Sprawdź czy fiszka należy do użytkownika
    if (flashcard.user_id !== userId) {
      console.error("Flashcard belongs to different user:", {
        flashcardUserId: flashcard.user_id,
        requestUserId: userId,
      });
      throw new Error("Flashcard not found");
    }

    // 2. Sprawdź kategorię (jeśli podana)
    if (data.categoryId) {
      const { data: category, error: categoryError } = await supabase
        .from("categories")
        .select("id")
        .eq("id", data.categoryId)
        .eq("user_id", userId)
        .single();

      if (categoryError || !category) {
        console.error("Category not found:", categoryError);
        throw new Error("Category not found");
      }
    }

    // 3. Przygotuj dane do aktualizacji (tylko zmienione pola)
    const updateData: any = {};
    if (data.question !== undefined) updateData.question = data.question;
    if (data.answer !== undefined) updateData.answer = data.answer;
    if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
    updateData.updated_at = new Date().toISOString();

    console.log("Updating with data:", updateData);

    // 4. Aktualizuj fiszkę
    const { data: updated, error: updateError } = await supabase
      .from("flashcards")
      .update(updateData)
      .eq("id", flashcardId)
      .select()
      .single();

    if (updateError || !updated) {
      console.error("Error updating flashcard:", updateError);
      throw new Error("Failed to update flashcard");
    }

    // 5. Mapuj na DTO
    return {
      id: updated.id,
      question: updated.question,
      answer: updated.answer,
      categoryId: updated.category_id,
      generationId: updated.generation_id,
      source: updated.source,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  }
}
