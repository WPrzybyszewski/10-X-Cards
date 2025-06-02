import type { Tables, TablesInsert, TablesUpdate, Enums, Json } from './db/database.types'

/**
 * Enum re-exports for convenience within the application layer.
 */
export type FlashcardSource = Enums<'flashcard_source'>
export type GenerationStatus = Enums<'generation_status'> | 'cancelled'

/* -------------------------------------------------------------------------- */
/*                               DB Row Aliases                               */
/* -------------------------------------------------------------------------- */

/** Direct aliases to Supabase generated table row types. */
export type CategoryRow = Tables<'categories'>
export type FlashcardRow = Tables<'flashcards'>
export type GenerationRow = Tables<'generations'>

/* -------------------------------------------------------------------------- */
/*                                 CATEGORIES                                 */
/* -------------------------------------------------------------------------- */

/**
 * Response DTO returned from the API for a single Category.
 * Field names are converted to camelCase to follow JSON naming conventions
 * while preserving their original DB-driven value types via indexed access.
 */
export interface CategoryDTO {
  id: CategoryRow['id']
  name: CategoryRow['name']
  createdAt: CategoryRow['created_at']
  updatedAt: CategoryRow['updated_at']
}

/** Command payload for POST /categories */
export type CreateCategoryCommand = Pick<TablesInsert<'categories'>, 'name'>

/** Command payload for PATCH /categories/{id} */
export type UpdateCategoryCommand = Pick<TablesUpdate<'categories'>, 'name'>

/* -------------------------------------------------------------------------- */
/*                                 FLASHCARDS                                 */
/* -------------------------------------------------------------------------- */

/** Standard flashcard representation used by most GET endpoints. */
export interface FlashcardDTO {
  id: FlashcardRow['id']
  question: FlashcardRow['question']
  answer: FlashcardRow['answer']
  categoryId: FlashcardRow['category_id']
  generationId: FlashcardRow['generation_id']
  source: FlashcardRow['source']
  createdAt: FlashcardRow['created_at']
  updatedAt: FlashcardRow['updated_at']
}

/** Command payload for POST /flashcards */
export interface CreateFlashcardCommand {
  question: FlashcardRow['question']
  answer: FlashcardRow['answer']
  /** Optional reference to an existing category owned by the user */
  categoryId?: FlashcardRow['category_id']
}

/** Command payload for PATCH /flashcards/{id} */
export interface UpdateFlashcardCommand {
  question?: FlashcardRow['question']
  answer?: FlashcardRow['answer']
  categoryId?: FlashcardRow['category_id']
}

/* -------------------------------------------------------------------------- */
/*                                GENERATIONS                                 */
/* -------------------------------------------------------------------------- */

/** Command payload for POST /generations */
export interface SubmitGenerationCommand {
  sourceText: GenerationRow['source_text']
  /** Optional LLM identifier; validated server-side */
  model?: GenerationRow['model_used']
  /** Optional category pre-assignment for resulting flashcards */
  categoryId?: FlashcardRow['category_id']
}

/** Lightweight representation returned immediately after submission. */
export interface GenerationDTO {
  id: GenerationRow['id']
  status: GenerationStatus
  createdAt: GenerationRow['created_at']
  updatedAt: GenerationRow['updated_at']
  modelUsed: GenerationRow['model_used']
}

/** Minimal preview of a flashcard suggested by the generation engine. */
export interface GeneratedFlashcardPreviewDTO {
  question: FlashcardRow['question']
  answer: FlashcardRow['answer']
}

/** Command payload for POST /generations/{id}/accept */
export interface AcceptGeneratedCardsCommand {
  /**
   * If omitted, the backend will accept all generated suggestions.
   * When provided, must reference a subset of the originally generated list.
   */
  flashcards?: GeneratedFlashcardPreviewDTO[]
}

/* -------------------------------------------------------------------------- */
/*                         AUTHENTICATION-RELATED DTOs                         */
/* -------------------------------------------------------------------------- */

/** Command payload for POST /auth/signup */
export interface SignupCommand {
  email: string
  password: string
}

/** Command payload for POST /auth/login */
export interface LoginCommand {
  email: string
  password: string
}

/** JWT tokens returned after successful authentication */
export interface AuthTokenDTO {
  accessToken: string
  /**
   * Optional refresh token – only supplied when the client opts-in to
   * long-lived sessions (cookies / remember-me flow).
   */
  refreshToken?: string
}

/** Command payload for POST /auth/reset-password */
export interface PasswordResetCommand {
  email: string
}

/** Command payload for POST /auth/reset-password/confirm */
export interface PasswordResetConfirmCommand {
  token: string
  newPassword: string
}

/* -------------------------------------------------------------------------- */
/*                                ERROR SHAPES                                */
/* -------------------------------------------------------------------------- */

/** Standardised error envelope returned by all non-2xx responses. */
export interface ErrorDTO {
  error: {
    code: string
    message: string
    /** Arbitrary JSON payload with field-level or context-specific details. */
    details?: Json
  }
}

/* -------------------------------------------------------------------------- */
/*                            FRONTEND VIEW MODELS                            */
/* -------------------------------------------------------------------------- */

export interface ModelOption {
  label: string;
  value: string;
}

export interface GenerationTaskVM {
  id: string
  status: GenerationStatus
  createdAt: string
  modelUsed: string
  progress?: number
}

/* -------------------------------------------------------------------------- */
/*                                    MISC                                    */
/* -------------------------------------------------------------------------- */
export interface User {
  id: string
  email: string
}

export interface Locals {
  user?: User
  supabase?: any
  [key: string]: unknown
}
