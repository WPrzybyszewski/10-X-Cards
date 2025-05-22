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
} 