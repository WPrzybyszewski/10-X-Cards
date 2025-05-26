import type { CategoryDTO } from '../../types';
import type { CreateCategoryCommand } from '../validators/category';
import type { SupabaseClient } from '@supabase/supabase-js';

export class CategoryService {
  /**
   * Tworzy nową kategorię dla użytkownika.
   * @throws {Error} Gdy kategoria o takiej nazwie już istnieje
   * @throws {Error} Gdy wystąpi błąd bazy danych
   */
  static async createCategory(
    supabase: SupabaseClient,
    userId: string,
    data: CreateCategoryCommand
  ): Promise<CategoryDTO> {
    // 1. Sprawdź czy nazwa jest unikalna dla użytkownika
    const { data: existing, error: checkError } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', data.name)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking category uniqueness:', checkError);
      throw new Error('Failed to check category uniqueness');
    }

    if (existing) {
      throw new Error('Category with this name already exists');
    }

    // 2. Utwórz nową kategorię
    const { data: created, error: createError } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: data.name,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating category:', createError);
      throw new Error('Failed to create category');
    }

    // 3. Mapuj na DTO
    return {
      id: created.id,
      name: created.name,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    };
  }
} 