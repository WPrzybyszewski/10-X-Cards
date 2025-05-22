# API Endpoint Implementation Plan: POST /categories

## 1. Przegląd punktu końcowego

Udostępnia możliwość tworzenia nowej kategorii do grupowania fiszek użytkownika. Nazwa kategorii musi być unikalna w obrębie jednego użytkownika.

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **URL:** `/api/v1/categories`
- **Parametry URL:** brak
- **Request Body (JSON):**
  ```json
  {
    "name": "Programming"
  }
  ```
  - **name** (string, 1–100 znaków) – wymagane, unikalne per użytkownik.

## 3. Wykorzystywane typy

| Nazwa                         | Lokalizacja                      |
| ----------------------------- | -------------------------------- |
| `CreateCategoryCommand`       | `src/types.ts`                   |
| `CreateCategoryCommandSchema` | `src/lib/validators/category.ts` |
| `CategoryDTO`                 | `src/types.ts`                   |
| `CategoryRow`                 | Supabase typy                    |

## 4. Szczegóły odpowiedzi

- **Kod sukcesu:** 201 Created
- **Nagłówki:** `Location: /api/v1/categories/{id}`
- **Body (CategoryDTO):**
  ```json
  {
    "id": "uuid",
    "name": "Programming",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```

## 5. Przepływ danych

1. Endpoint przyjmuje POST JSON.
2. Autoryzacja – JWT middleware → `userId`.
3. Walidacja payloadu Zod (`CreateCategoryCommandSchema`).
4. Sprawdzenie duplikatu nazwy:
   ```sql
   SELECT 1 FROM categories WHERE user_id = :userId AND name ILIKE :name;
   ```
   - Jeżeli istnieje → 409 Conflict.
5. Wstawienie nowej kategorii do `categories`:
   ```ts
   const { data, error } = await supabase
     .from('categories')
     .insert({ user_id: userId, name })
     .select()
     .single()
   ```
6. Konwersja rekordu do `CategoryDTO` i zwrócenie **201 Created** + nagłówek `Location`.

## 6. Względy bezpieczeństwa

- **JWT Auth**: wymagany token.
- **RLS**: tabele z polityką `user_id = auth.uid()`.
- **Walidacja inputu**: długość, unikalność.
- **Rate limit**: global + per-endpoint middleware.

## 7. Obsługa błędów

| Kod | Scenariusz                           | `ErrorDTO.code`         |
| --- | ------------------------------------ | ----------------------- |
| 400 | Walidacja danych (`name`)            | `VALIDATION_ERROR`      |
| 401 | Brak / nieważny token                | `UNAUTHORIZED`          |
| 409 | Duplikat nazwy w obrębie użytkownika | `CONFLICT`              |
| 429 | Rate limit                           | `TOO_MANY_REQUESTS`     |
| 500 | Błąd serwera / DB                    | `INTERNAL_SERVER_ERROR` |

## 8. Rozważania dotyczące wydajności

- Indeks złożony `(user_id, lower(name))` zapewni unikalność i szybkie sprawdzanie duplikatów.

## 9. Etapy wdrożenia

1. **Validator**: `CreateCategoryCommandSchema` w `src/lib/validators/category.ts`.
2. **Service**: `CategoryService` (`src/lib/services/category.service.ts`) z metodą `createCategory(userId, payload)`.
3. **Endpoint**: `src/pages/api/v1/categories/index.ts` – handler `POST`.
4. **Testy**: jednostkowe (schema), integracyjne (duplikat, auth, happy-path).
5. **OpenAPI**: aktualizacja specyfikacji.
6. **CI/CD**: dodać testy.
7. **Monitoring & logging**: logowanie duplikatów.

---

### Uzupełnienie PATCH /flashcards/{id}

Aktualizacja kategorii fiszek jest obsłużona przez istniejący plan `.ai/flashcards-edit-implementation-plan.md` – pole `categoryId`.
