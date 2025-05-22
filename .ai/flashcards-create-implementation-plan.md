# API Endpoint Implementation Plan: POST /flashcards

## 1. Przegląd punktu końcowego

Endpoint umożliwia ręczne dodanie nowej fiszki przez użytkownika. Po pomyślnym utworzeniu rekord trafia do tabeli `flashcards` z oznaczeniem `source = "manual"` i (opcjonalnie) przypisaną kategorią.

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/v1/flashcards`
- **Parametry URL:** brak
- **Request Body:** (JSON)
  ```json
  {
    "question": "What is a closure in JavaScript?",
    "answer": "A closure is...",
    "categoryId": "uuid" // optional
  }
  ```
  - **question** (string, 1–200 znaków) – wymagane
  - **answer** (string, 1–500 znaków) – wymagane
  - **categoryId** (UUID) – opcjonalne; musi wskazywać istniejącą kategorię należącą do użytkownika

## 3. Wykorzystywane typy

- **Command Model:** `CreateFlashcardCommand` (`src/types.ts`)
- **DTO:** `FlashcardDTO` – zwracany w odpowiedzi
- **Inne typy:** `CategoryRow`, `FlashcardRow`

## 4. Szczegóły odpowiedzi

- **Kod sukcesu:** 201 Created
- **Nagłówki:** `Location: /api/v1/flashcards/{id}`
- **Body:**
  ```json
  {
    "id": "uuid",
    "question": "What is a closure in JavaScript?",
    "answer": "A closure is...",
    "categoryId": "uuid",
    "generationId": null,
    "source": "manual",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```

## 5. Przepływ danych

1. Endpoint odbiera żądanie POST z JSON.
2. Pobiera `supabase` z `locals` oraz `userId` z JWT.
3. Waliduje body przy użyciu `CreateFlashcardCommandSchema` (Zod).
4. Jeśli `categoryId` jest podane:
   - Sprawdza istnienie kategorii i własność użytkownika (zapytanie SELECT).
   - Gdy nie istnieje → 404.
5. Wstawia rekord do tabeli `flashcards` z polami:
   - `user_id = userId`
   - `source = "manual"`
   - `generation_id = null`
6. Zwraca **201 Created**, nagłówek `Location` oraz nową fiszkę jako `FlashcardDTO`.

## 6. Względy bezpieczeństwa

- **Autoryzacja:** Wymagany poprawny token JWT.
- **RLS:** Polityki Supabase blokują dostęp do cudzych rekordów.
- **Walidacja:** Zod + sprawdzenie długości pól + weryfikacja kategorii.
- **Sanityzacja:** Strip/escape potencjalnie niebezpiecznych znaków (XSS) – lub rely on output encoding w UI.

## 7. Obsługa błędów

| Kod | Scenariusz                              | `ErrorDTO.code`         |
| --- | --------------------------------------- | ----------------------- |
| 400 | Walidacja pól (`question`, `answer`)    | `VALIDATION_ERROR`      |
| 401 | Brak/nieprawidłowy token                | `UNAUTHORIZED`          |
| 404 | `categoryId` nie istnieje lub cudza     | `CATEGORY_NOT_FOUND`    |
| 429 | Przekroczono limit zapytań (middleware) | `TOO_MANY_REQUESTS`     |
| 500 | Nieoczekiwany błąd bazy/serwera         | `INTERNAL_SERVER_ERROR` |

## 8. Rozważania dotyczące wydajności

- Indeks na `(user_id, category_id)` w tabeli `flashcards` usprawni filtrowanie.
- Insert pojedynczy – niski koszt; brak specjalnych optymalizacji.

## 9. Etapy wdrożenia

1. **Validator:** Dodaj `CreateFlashcardCommandSchema` w `src/lib/validators/flashcard.ts`.
2. **Service:** Utwórz `FlashcardService` (`src/lib/services/flashcard.service.ts`) z metodą `createFlashcard(userId, payload)`.
3. **Endpoint:** Utwórz `src/pages/api/v1/flashcards/index.ts`:
   - `export const POST` z logiką opisaną w przepływie.
   - `export const GET` może zostać dodany później (listowanie).
4. **Testy:** Integracyjne + jednostkowe dla walidatora i serwisu.
5. **Dokumentacja:** Aktualizacja pliku OpenAPI & README.
6. **CI:** Dodaj testy do pipeline GitHub Actions.
