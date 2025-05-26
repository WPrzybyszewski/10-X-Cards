/**
 * Dane wejściowe do utworzenia rekordu generations.
 * Wersja produkcyjna: przekazywane do Supabase.
 */
export interface GenerationCreateInput {
  userId: string;
  sourceText: string;
  model: string;
  categoryId?: string;
}

/**
 * Minimalny DTO rekordu generations zwracany do klienta.
 */
export interface GenerationRecord {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  modelUsed: string;
}

import type { FlashcardDTO, GenerationTaskVM } from '../../types';
import type { AcceptGeneratedCardsCommand, GeneratedFlashcardPreview } from '../validators/generation';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaginationParams } from "../validators/pagination";

// Stałe dla statusów generacji zgodne z enumem w bazie
const GENERATION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

interface GenerationListResult {
  data: GenerationTaskVM[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
}

/**
 * Serwis do obsługi logiki generations (mock).
 * Wersja produkcyjna: operacje na bazie, kolejce, logach.
 */
export class GenerationService {
  /**
   * Tworzy rekord generations (mock: generuje UUID, daty, status)
   * Wersja produkcyjna: insert do Supabase.
   *
   * TODO: Zamień mock na realny insert do Supabase, np.:
   *   const { data, error } = await supabase.from('generations').insert({...}).select().single();
   *   if (error) throw error;
   *   return { ... }
   */
  static async create(input: GenerationCreateInput): Promise<GenerationRecord> {
    const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    const now = new Date().toISOString();
    return {
      id,
      status: 'processing',
      createdAt: now,
      updatedAt: now,
      modelUsed: input.model,
    };
  }

  /**
   * Publikuje zadanie do kolejki (mock: no-op)
   * Wersja produkcyjna: enqueue do Supabase Functions/queue.
   *
   * TODO: Zamień mock na realne enqueue, np. publish do kolejki lub wywołanie Supabase Function.
   */
  static async enqueueGeneration(id: string): Promise<void> {
    return;
  }

  /**
   * Loguje błąd generowania (mock: console.error)
   * Wersja produkcyjna: insert do generation_error_logs.
   *
   * TODO: Zamień mock na realny insert do generation_error_logs w Supabase.
   */
  static async logError(generationId: string, error: unknown): Promise<void> {
    console.error('Generation error', { generationId, error });
    return;
  }

  /**
   * Pobiera listę zadań generacji dla użytkownika z paginacją.
   * @throws {Error} Gdy wystąpi błąd podczas pobierania danych
   */
  static async getList(
    supabase: SupabaseClient,
    userId: string, 
    params: PaginationParams
  ): Promise<GenerationListResult> {
    try {
      // Pobierz dane z paginacją
      const { data, error, count } = await supabase
        .from("generations")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(
          (params.page - 1) * params.limit,
          params.page * params.limit - 1
        );

      if (error) {
        console.error("Error fetching generations:", error);
        throw new Error("Failed to fetch generations");
      }

      // Mapuj na GenerationTaskVM
      const generations = (data || []).map(row => ({
        id: row.id,
        status: row.status,
        createdAt: row.created_at,
        modelUsed: row.model_used,
        progress: row.progress,
      }));

      return {
        data: generations,
        pagination: {
          page: params.page,
          limit: params.limit,
          totalItems: count || 0,
          totalPages: Math.ceil((count || 0) / params.limit),
        },
      };
    } catch (error) {
      console.error("Error in GenerationService.getList:", error);
      throw new Error("Failed to fetch generations list");
    }
  }

  /**
   * Akceptuje wygenerowane fiszki i zapisuje je w bazie.
   * @throws {Error} Gdy zadanie nie istnieje lub nie należy do użytkownika
   * @throws {Error} Gdy zadanie jest już zaakceptowane lub anulowane
   */
  static async acceptGeneratedCards(
    supabase: SupabaseClient,
    userId: string,
    generationId: string,
    data?: AcceptGeneratedCardsCommand
  ): Promise<FlashcardDTO[]> {
    console.log("Accepting flashcards for generation:", { generationId, userId });

    // 0. Najpierw sprawdźmy czy generacja w ogóle istnieje (bez filtra na user_id)
    const { data: allGenerations, error: findAllError } = await supabase
      .from("generations")
      .select("id, user_id, status")
      .eq("id", generationId);

    console.log("All generations with this ID:", allGenerations);
    
    if (findAllError) {
      console.error("Error checking generation existence:", findAllError);
    }

    // 1. Sprawdź czy zadanie istnieje i należy do użytkownika
    const { data: generations, error: findError } = await supabase
      .from("generations")
      .select("*")
      .eq("id", generationId)
      .eq("user_id", userId);

    console.log("Find generation result:", { 
      generations, 
      error: findError,
      searchParams: { generationId, userId }
    });

    if (findError) {
      console.error("Error finding generation:", findError);
      throw new Error("Generation not found");
    }

    if (!generations || generations.length === 0) {
      // Sprawdźmy czy to problem z user_id czy z samym ID generacji
      if (allGenerations && allGenerations.length > 0) {
        console.error("Generation exists but belongs to different user:", {
          generationId,
          requestedUserId: userId,
          actualUserId: allGenerations[0].user_id
        });
      } else {
        console.error("Generation not found at all:", { generationId });
      }
      throw new Error("Generation not found");
    }

    const generation = generations[0];
    console.log("Found generation:", {
      id: generation.id,
      status: generation.status,
      userId: generation.user_id
    });

    // 2. Sprawdź status zadania
    if ([GENERATION_STATUS.COMPLETED, GENERATION_STATUS.CANCELLED].includes(generation.status)) {
      throw new Error("Generation already processed");
    }

    // 3. Pobierz sugerowane fiszki
    let flashcardsToAccept: GeneratedFlashcardPreview[];
    if (data?.flashcards) {
      // Użyj tylko wybranych fiszek
      flashcardsToAccept = data.flashcards;
    } else {
      // Użyj wszystkich sugerowanych fiszek
      flashcardsToAccept = generation.generated_flashcards || [];
    }

    if (flashcardsToAccept.length === 0) {
      throw new Error("No flashcards to accept");
    }

    // 4. Zapisz fiszki w bazie
    const { data: createdFlashcards, error: insertError } = await supabase
      .from("flashcards")
      .insert(
        flashcardsToAccept.map(f => ({
          user_id: userId,
          question: f.question,
          answer: f.answer,
          generation_id: generationId,
          source: "ai",
          category_id: generation.category_id,
        }))
      )
      .select();

    if (insertError) {
      console.error("Error creating flashcards:", insertError);
      throw new Error("Failed to create flashcards");
    }

    // 5. Aktualizuj status zadania
    const { error: updateError } = await supabase
      .from("generations")
      .update({
        status: GENERATION_STATUS.COMPLETED,
        updated_at: new Date().toISOString(),
      })
      .eq("id", generationId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating generation status:", updateError);
      throw new Error("Failed to update generation status");
    }

    // 6. Mapuj na DTO
    return (createdFlashcards || []).map(f => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      categoryId: f.category_id,
      generationId: f.generation_id,
      source: f.source,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    }));
  }

  /**
   * Sprawdza szczegóły zadania generacji.
   * Pomocna metoda do debugowania.
   */
  static async getGenerationDetails(
    supabase: SupabaseClient,
    generationId: string
  ): Promise<any> {
    const { data, error } = await supabase
      .from("generations")
      .select("id, user_id, status, created_at, model_used")
      .eq("id", generationId)
      .single();

    if (error) {
      console.error("Error fetching generation details:", error);
      throw new Error("Failed to fetch generation details");
    }

    console.log("Generation details:", data);
    return data;
  }
} 