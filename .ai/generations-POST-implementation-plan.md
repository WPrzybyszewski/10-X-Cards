# API Endpoint Implementation Plan: POST /generations

## 1. Przegląd punktu końcowego

Tworzy nowe zadanie generowania fiszek przez AI. Zwraca identyfikator zadania i status _processing_ (HTTP 202). Logika generowania jest asynchroniczna i wykonywana przez _background job_.

## 2. Szczegóły żądania

- Metoda HTTP: **POST**
- Ścieżka URL: `/api/v1/generations`
- Nagłówki:
  - `Authorization: Bearer <JWT>` – token Supabase
  - `Content-Type: application/json`
- Parametry URL: _brak_
- Request Body (JSON):
  ```json
  {
    "sourceText": "<article snippet>",
    "categoryId": "uuid" // opcjonalne
  }
  ```
  - **sourceText** (string, 1 000–10 000 znaków) – wymagane
  - **model** (string) – opcjonalne, musi należeć do listy dozwolonych modeli
  - **categoryId** (UUID) – opcjonalne, musi wskazywać kategorię użytkownika

## 2.1 Konfiguracja środowiska

Endpoint wymaga następujących zmiennych środowiskowych:

- `DEFAULT_MODEL` – domyślny model AI do użycia (np. "openrouter/opus-mixtral-8x22b")

## 3. Wykorzystywane typy

- `SubmitGenerationCommand` (z `src/types.ts`) – do walidacji body
- `GenerationDTO` – do odpowiedzi (id, status)
- `GenerationRow`, `CategoryRow` – dostęp do bazy danych

## 4. Szczegóły odpowiedzi

- Kod statusu: **202 Accepted**
- Body:
  ```json
  {
    "id": "uuid",
    "status": "processing"
  }
  ```
- Nagłówki pomocnicze:
  - `Location: /api/v1/generations/{id}` (link do statusu)

## 5. Przepływ danych

1. **Astro endpoint** `/src/pages/api/v1/generations.ts` (POST) otrzymuje request.
2. Walidacja danych wejściowych przy pomocy Zod (`SubmitGenerationCommandSchema`).
3. Pobranie obiektu `supabase` z `Astro.locals` (zg. z backend rule).
4. Sprawdzenie istnienia `categoryId` (jeśli podane) i własności użytkownika.
5. Pobranie domyślnego modelu z konfiguracji (`DEFAULT_MODEL`) lub użycie wartości fallback.
6. Utworzenie rekordu w tabeli `generations` z początkowym `status = 'pending'` i `model_used` z konfiguracji.
7. Wywołanie `generationService.enqueueGeneration(generationId)` – logika w `src/lib/services/generation.service.ts` publikuje wiadomość na kolejkę (np. Supabase Functions / queue).
8. Endpoint zwraca **202** oraz `GenerationDTO`.
9. **Background worker** odbiera zdarzenie, aktualizuje status na `processing`, wywołuje Openrouter.ai, analizuje odpowiedź, aktualizuje `generated_flashcards` oraz `status = completed` lub `failed`.
10. W razie błędu zapisuje entry w `generation_error_logs` poprzez `generationService.logError`.

## 6. Względy bezpieczeństwa

- **Auth**: JWT w nagłówku; sprawdzenie `session`, `user.id`.
- **RLS**: zapisy w `tabeli generations` odbywają się z `user_id = auth.uid()` – zgodnie z policy.
- Walidacja _categoryId_ zapobiega wstrzyknięciu nieprawidłowych wartości.
- Model AI jest kontrolowany przez konfigurację serwera, co zapobiega manipulacji przez użytkownika.
- Limit rozmiaru `sourceText` ≤ 50 000 znaków, middleware blokuje większe payloady.
- Rate-limit na poziomie middleware – 10 zapytań / min / użytkownik.

## 7. Obsługa błędów

| Sytuacja                                                | Kod | Format `ErrorDTO.message` |
| ------------------------------------------------------- | --- | ------------------------- |
| Nieprawidłowe body / walidacja                          | 400 | "Validation failed"       |
| Brak / nieważny token                                   | 401 | "Unauthorized"            |
| `categoryId` nie istnieje lub nie należy do użytkownika | 404 | "Category not found"      |
| Wewnętrzny błąd DB / kolejki                            | 500 | "Internal server error"   |

`generationService.logError` dodaje wiersz do `generation_error_logs` w przypadku błędu background worker + aktualizuje status na `failed`.

## 8. Rozważania dotyczące wydajności

- Odczyty/generowanie wykonywane asynchronicznie – endpoint zwraca natychmiast.
- Indeks `idx_generations_user_id` i `idx_generations_status` wspiera późniejsze listowanie.
- `sourceText` duży → przechowywany w `TEXT`; brak dodatkowej kopii w payloadzie odpowiedzi.

## 9. Etapy wdrożenia

1. **DTO & schema**: Dodaj `SubmitGenerationCommandSchema` (Zod) w `src/lib/validators/generation.ts`.
2. **Service**: Utwórz `generation.service.ts` z metodami `create`, `enqueueGeneration`, `logError`.
3. **Queue**: Skonfiguruj Supabase Function/background worker `processGeneration.ts` (odbiera id, wykonuje AI call, zapisuje wyniki, loguje błędy).
4. **Endpoint**: `POST /generations`– implementacja według kroków z sekcji 5.
5. **Middleware**: Dodać rate limiter oraz limit rozmiaru requestu.
6. **Testy integracyjne**: End-to-end z mockiem Openrouter.
7. **Dokumentacja**: Zaktualizuj OpenAPI, README.
8. **Konfiguracja**: Dodaj zmienną środowiskową `DEFAULT_MODEL` do konfiguracji serwera.
