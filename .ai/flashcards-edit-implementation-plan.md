# API Endpoint Implementation Plan: PATCH /flashcards/{flashcardId}

## 1. Przegląd punktu końcowego

Aktualizuje istniejącą fiszkę należącą do użytkownika. Wspiera częściową aktualizację dowolnej kombinacji pól `question`, `answer` oraz `categoryId`. Nie zmienia pól `source` ani `generationId`.

## 2. Szczegóły żądania

- **Metoda HTTP:** PATCH
- **URL:** `/api/v1/flashcards/{flashcardId}`
- **Parametry URL:**
  - `flashcardId` (UUID, wymagany) – identyfikator edytowanej fiszki.
- **Request Body (JSON, min 1 pole):**
  ```json
  {
    "question": "Nowe pytanie?", // opcjonalne, 1–200 znaków
    "answer": "Nowa odpowiedź...", // opcjonalne, 1–500 znaków
    "categoryId": "uuid" // opcjonalne, musi należeć do użytkownika
  }
  ```

## 3. Wykorzystywane typy

| Nazwa                          | Lokalizacja                       |
| ------------------------------ | --------------------------------- |
| `UpdateFlashcardCommand`       | `src/types.ts`                    |
| `UpdateFlashcardCommandSchema` | `src/lib/validators/flashcard.ts` |
| `FlashcardDTO`                 | `src/types.ts`                    |
| `FlashcardRow`, `CategoryRow`  | Supabase typy                     |

## 4. Szczegóły odpowiedzi

- **Kod sukcesu:** 200 OK
- **Body (FlashcardDTO):**
  ```json
  {
    "id": "uuid",
    "question": "Nowe pytanie?",
    "answer": "Nowa odpowiedź...",
    "categoryId": "uuid",
    "generationId": null,
    "source": "manual",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```

## 5. Przepływ danych

1. Odbiór PATCH z `flashcardId` + JSON payload.
2. Autoryzacja – weryfikacja JWT w middleware; uzyskanie `userId`.
3. Walidacja payloadu przez `UpdateFlashcardCommandSchema` (Zod):
   - co najmniej jedno z pól `question`, `answer`, `categoryId` jest obecne,
   - ograniczenia długości,
   - UUID dla `categoryId`.
4. Sprawdzenie istnienia fiszki i własności:
   ```sql
   SELECT * FROM flashcards WHERE id = :flashcardId AND user_id = :userId;
   ```
   - Brak => 404.
5. Jeśli przekazano `categoryId`, sprawdzenie istnienia i własności kategorii.
6. Budowa obiektu `updateData` zawierającego tylko przekazane pola.
7. Aktualizacja w Supabase:
   ```ts
   await supabase
     .from('flashcards')
     .update(updateData)
     .eq('id', flashcardId)
     .eq('user_id', userId)
     .single()
   ```
8. Zwrócenie zaktualizowanego rekordu jako `FlashcardDTO` + 200.

## 6. Względy bezpieczeństwa

- **JWT Auth**: wymagany; brak tokenu ⇒ 401.
- **RLS**: tabele mają polityki wymuszające `user_id` = `auth.uid()`.
- **Ownership checks**: dodatkowa kontrola w kodzie dla szybszej odpowiedzi.
- **Walidacja & sanitizacja**: Zod + ewentualne strip HTML w BE lub encode w FE.
- **Concurrency**: brak ETag/If-Match w MVP; można dodać później.

## 7. Obsługa błędów

| Kod | Scenariusz                                  | `ErrorDTO.code`         |
| --- | ------------------------------------------- | ----------------------- |
| 400 | Niepoprawny JSON / brak pól do aktualizacji | `VALIDATION_ERROR`      |
| 401 | Brak lub nieważny JWT                       | `UNAUTHORIZED`          |
| 403 | Fiszka nie należy do użytkownika            | `FORBIDDEN`             |
| 404 | Fiszka lub `categoryId` nie istnieje        | `NOT_FOUND`             |
| 429 | Limit zapytań (middleware)                  | `TOO_MANY_REQUESTS`     |
| 500 | Wewnętrzny błąd DB/serwera                  | `INTERNAL_SERVER_ERROR` |

## 8. Rozważania dotyczące wydajności

- Aktualizacja pojedynczego wiersza – niski koszt.
- Indeks PK na `id` zapewnia szybkie wyszukiwanie.
- Jeżeli `categoryId` często aktualizowane, upewnić się, że indeks obejmuje `category_id`.

## 9. Etapy wdrożenia

1. **Validator**: dodaj `UpdateFlashcardCommandSchema` z warunkiem `min(1)` pól.
2. **Service**: rozszerz `FlashcardService` o `updateFlashcard(userId, flashcardId, payload)`.
3. **Endpoint**: utwórz `src/pages/api/v1/flashcards/[flashcardId].ts` z handlerem `PATCH` zgodnym z wytycznymi Astro.
4. **Testy**:
   - Jednostkowe – schema, service.
   - Integracyjne – endpoint (success, ownership, not found, validation, category missing).
5. **OpenAPI**: aktualizacja specyfikacji.
6. **CI/CD**: uruchomienie testów w pipeline.
7. **Monitoring & logging**: logowanie błędów z kontekstem użytkownika i `flashcardId`.
