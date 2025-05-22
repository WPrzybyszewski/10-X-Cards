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

  /**
   * Pobiera listę zadań generacji dla użytkownika z paginacją.
   * @throws {Error} Gdy wystąpi błąd podczas pobierania danych
   */
  static async getList(userId: string, params: PaginationParams): Promise<GenerationListResult> {
    try {
      // TODO: Integracja z Supabase - przykład implementacji:
      // const { data, error, count } = await supabase
      //   .from('generations')
      //   .select('*', { count: 'exact' })
      //   .eq('user_id', userId)
      //   .order('created_at', { ascending: false })
      //   .range(
      //     (params.page - 1) * params.limit,
      //     params.page * params.limit - 1
      //   );
      // if (error) throw new Error(error.message);
      // 
      // return {
      //   data: data.map(row => ({
      //     id: row.id,
      //     status: row.status,
      //     createdAt: row.created_at,
      //     modelUsed: row.model_used,
      //     progress: row.progress
      //   })),
      //   pagination: {
      //     page: params.page,
      //     limit: params.limit,
      //     totalItems: count || 0,
      //     totalPages: Math.ceil((count || 0) / params.limit)
      //   }
      // };

      // Mock data dla rozwoju
      const mockData: GenerationTaskVM[] = [
        {
          id: '11111111-1111-1111-1111-111111111111',
          status: 'completed',
          createdAt: new Date().toISOString(),
          modelUsed: 'openrouter/opus-mixtral-8x22b',
          progress: 100,
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          status: 'processing',
          createdAt: new Date().toISOString(),
          modelUsed: 'openrouter/opus-mixtral-8x22b',
          progress: 45,
        },
      ];

      const totalItems = mockData.length;
      const totalPages = Math.ceil(totalItems / params.limit);

      return {
        data: mockData.slice((params.page - 1) * params.limit, params.page * params.limit),
        pagination: {
          page: params.page,
          limit: params.limit,
          totalPages,
          totalItems,
        },
      };
    } catch (error) {
      console.error('Error in GenerationService.getList:', error);
      throw new Error('Failed to fetch generations list');
    }
  }
} 