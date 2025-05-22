# API Endpoint Implementation Plan: POST /generations/{generationId}/accept

## 1. Przegląd punktu końcowego

Endpoint umożliwia akceptację sugerowanych fiszek wygenerowanych przez silnik AI. Klient może zaakceptować wszystkie sugerowane fiszki lub wybrać określone, które mają zostać zapisane. Po akceptacji, fiszki są zapisywane w bazie danych, a status zadania generacji jest odpowiednio aktualizowany.

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/v1/generations/{generationId}/accept`
- **Parametry URL:**
  - `generationId` (wymagany) – identyfikator zadania generacji (UUID)
- **Request Body:** (JSON, opcjonalny)
  ```json
  {
    "flashcards": [
      { "question": "Pytanie?", "answer": "Odpowiedź." },
      { "question": "Pytanie 2?", "answer": "Odpowiedź 2." }
    ]
  }
  ```
  - **flashcards:** (opcjonalne) Array obiektów typu `GeneratedFlashcardPreviewDTO`. Jeśli pole jest pominięte, akceptowane są wszystkie sugerowane fiszki.

## 3. Wykorzystywane typy

- **Command Model:** `AcceptGeneratedCardsCommand` (definiowany w `src/types.ts`)
- **DTO:** `FlashcardDTO` – reprezentacja zaakceptowanych fiszek
- **Inne typy:** `GenerationRow`, `GeneratedFlashcardPreviewDTO`

## 4. Szczegóły odpowiedzi

- **Kod sukcesu:** 200 OK
- **Struktura odpowiedzi:** Zwracana jest lista zaakceptowanych fiszek w formacie:

  ```json
  [
    {
      "id": "uuid",
      "question": "Pytanie?",
      "answer": "Odpowiedź.",
      "categoryId": "uuid",
      "generationId": "uuid",
      "source": "ai",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]
  ```

## 5. Przepływ danych

1. Endpoint pobiera `generationId` z parametrów URL oraz opcjonalny payload `AcceptGeneratedCardsCommand`.
2. Walidacja danych wejściowych przy użyciu Zod:
   - Sprawdzenie formatu `generationId`.
   - Walidacja struktury payloadu (jeśli podany `flashcards`).
3. Weryfikacja istnienia zadania generacji w bazie danych.
4. Weryfikacja uprawnień – upewnienie się, że użytkownik jest właścicielem zadania generacji.
5. Jeśli `flashcards` jest podane, akceptowane są tylko wybrane fiszki; w przeciwnym razie akceptowane są wszystkie sugerowane fiszki.
6. Wstawienie zaakceptowanych fiszek do tabeli `flashcards` z ustawieniem pola `source` na `"ai"` oraz przypisaniem `generationId`.
7. Aktualizacja statusu rekordu generacji (np. na `accepted`).
8. Zwrócenie zaakceptowanych fiszek jako odpowiedź.

## 6. Względy bezpieczeństwa

- **Autoryzacja:** Endpoint wymaga poprawnego tokenu JWT; `generationId` musi należeć do zalogowanego użytkownika.
- **Walidacja wejścia:** Użycie Zod do walidacji i sanitizacji danych.
- **Ograniczenie dostępu:** Użytkownik może zaakceptować fiszki tylko dla własnego zadania generacji.
- **Zapobieganie ponownej akceptacji:** Weryfikacja, czy zadanie nie zostało już zaakceptowane lub anulowane.

## 7. Obsługa błędów

- **400 Bad Request:** Błąd walidacji danych wejściowych.
- **401 Unauthorized:** Brak lub nieważny token JWT.
- **403 Forbidden:** Próba akceptacji fiszek dla zadania, którego użytkownik nie posiada.
- **404 Not Found:** Zadanie generacji o podanym `generationId` nie istnieje.
- **409 Conflict:** Zadanie generacji zostało już zaakceptowane lub anulowane.
- **500 Internal Server Error:** Niespodziewany błąd serwera.

## 8. Rozważania dotyczące wydajności

- Wykorzystanie indeksów na polu `generationId` dla optymalizacji zapytań.
- Bulk insert fiszek w jednej operacji, aby zmniejszyć liczbę operacji na bazie danych.
- Asynchroniczne operacje tam, gdzie to możliwe, by minimalizować opóźnienia.

## 9. Etapy wdrożenia

1. **Walidacja:** Utworzenie lub aktualizacja Zod schema dla `AcceptGeneratedCardsCommand` w `src/lib/validators/generation.ts`.
2. **Logika serwisowa:** Dodanie metody `acceptGeneratedCards` w `GenerationService` (w `src/lib/services/generation.service.ts`), która:
   - Weryfikuje istnienie zadania generacji.
   - Sprawdza uprawnienia użytkownika.
   - Przetwarza akceptację fiszek (wszystkich lub wybranych).
   - Aktualizuje status zadania generacji.
3. **Implementacja endpointu:** Utworzenie pliku endpointu (`src/pages/api/v1/generations/[generationId]/accept.ts`) obsługującego żądania POST:
   - Parsowanie parametrów URL i payloadu JSON.
   - Wywołanie metody `acceptGeneratedCards` z odpowiednimi argumentami.
   - Zwrócenie zaakceptowanych fiszek w odpowiedzi.
4. **Testy integracyjne:** Opracowanie testów, które obejmą scenariusze poprawne oraz błędne (np. błędne dane wejściowe, brak autoryzacji, zadanie nieistniejące, ponowna akceptacja).
5. **Logowanie i monitoring:** Implementacja logowania błędów oraz monitoringu nieudanych operacji.
6. **Dokumentacja:** Aktualizacja dokumentacji API oraz pliku OpenAPI, aby odzwierciedlały nowy endpoint.
7. **Deploy i testy end-to-end:** Przeprowadzenie wdrożenia na środowisko testowe oraz end-to-end testy.
