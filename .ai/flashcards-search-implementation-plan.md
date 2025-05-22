# API Endpoint Implementation Plan: GET /flashcards

## 1. Przegląd punktu końcowego

Endpoint zwraca paginowaną listę fiszek należących do zalogowanego użytkownika. Pozwala na wyszukiwanie pełnotekstowe (`search`) oraz filtrowanie po kategoriach, źródle, sortowaniu i zakresie czasu tworzenia/aktualizacji.

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **URL:** `/api/v1/flashcards`
- **Query Parameters:**
  | Parametr | Typ | Wymagany | Domyślny | Opis |
  | -------------- | ------- | -------- | -------- | ---- |
  | `page` | int | nie | `1` | Numer strony (≥1) |
  | `limit` | int | nie | `20` | Liczba rekordów (1-100) |
  | `search` | string | nie | — | Fraza wyszukiwania pełnotekstowego (question + answer) |
  | `categoryId` | UUID | nie | — | Filtr po kategorii |
  | `source` | string | nie | — | `manual` lub `ai` |
  | `sortBy` | string | nie | `createdAt` | `createdAt`, `updatedAt`, `question` |
  | `sortOrder` | string | nie | `desc` | `asc`, `desc` |

## 3. Wykorzystywane typy

| Nazwa          | Lokalizacja    |
| -------------- | -------------- |
| `FlashcardDTO` | `src/types.ts` |
| `ErrorDTO`     | `src/types.ts` |

## 4. Szczegóły odpowiedzi

- **Kod sukcesu:** 200 OK
- **Nagłówki paginacji:**
  - `X-Total-Count`: łączna liczba rekordów
  - `X-Total-Pages`: łączna liczba stron
- **Body (array FlashcardDTO):**
  ```json
  [
    {
      "id": "uuid",
      "question": "...",
      "answer": "...",
      "categoryId": "uuid",
      "generationId": "uuid | null",
      "source": "manual | ai",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]
  ```

## 5. Przepływ danych

1. Odbiór zapytania GET z parametrami.
2. Autoryzacja – JWT middleware -> `userId`.
3. Walidacja & normalizacja parametrów (Zod): page ≥1, limit 1-100, sortBy/Order dozwolone wartości, UUID format.
4. Budowa zapytania SQL:
   - `FROM flashcards` + `WHERE user_id = :userId`.
   - Opcjonalne filtry: `category_id`, `source`.
   - Pełnotekstowe wyszukiwanie `ILIKE %term%` na `question || ' ' || answer` (MVP) lub FTS (`plainto_tsquery`).
   - Sortowanie wg `sortBy` `sortOrder`.
   - `LIMIT :limit OFFSET (:page-1)*:limit`.
5. Wykonanie zapytania i pobranie count():
   ```sql
   SELECT COUNT(*) ...
   SELECT * ...
   ```
6. Mapowanie wyników do `FlashcardDTO`.
7. Ustawienie nagłówków paginacji i zwrócenie listy JSON.

## 6. Względy bezpieczeństwa

- **RLS** wymusza `user_id`; mimo to filtr w zapytaniu ogranicza scope.
- **SQL injection** zapobiegamy przez parametrized queries.
- **Rate limiting** – ochrona przed zapętlonymi wyszukiwaniami.

## 7. Obsługa błędów

| Kod | Scenariusz                              | `ErrorDTO.code`         |
| --- | --------------------------------------- | ----------------------- |
| 400 | Nieprawidłowe parametry query           | `VALIDATION_ERROR`      |
| 401 | Brak / nieważny token                   | `UNAUTHORIZED`          |
| 404 | (nie używamy – brak wyników zwraca 200) | —                       |
| 429 | Limit zapytań (middleware)              | `TOO_MANY_REQUESTS`     |
| 500 | Błąd serwera / DB                       | `INTERNAL_SERVER_ERROR` |

## 8. Rozważania dotyczące wydajności

- Indeks `GIN` dla FTS lub `btree` na `question` & `answer` dla ILIKE.
- Paginate vs offset – offset OK przy małych listach; rozważyć keyset w v2.
- Select ONLY potrzebne kolumny.

## 9. Etapy wdrożenia

1. **Validator**: `FlashcardQuerySchema` (`src/lib/validators/flashcard.ts`).
2. **Service**: dodać `listFlashcards(userId, query)` w `FlashcardService` – buduje SQL.
3. **Endpoint**: `src/pages/api/v1/flashcards/index.ts` – handler `GET` (obok POST).
4. **DB**: indeks FTS albo ILIKE + composite.
5. **Testy**: integracyjne – paging, search, filters, sorting.
6. **OpenAPI**: update spec.
7. **Monitoring**: log slow queries >p95.
