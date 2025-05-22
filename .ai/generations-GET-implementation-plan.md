/_ Creating the implementation plan for GET /generations endpoint _/

# API Endpoint Implementation Plan: GET /generations

## 1. Przegląd punktu końcowego

Endpoint GET /generations umożliwia autoryzowanemu użytkownikowi pobranie listy zadań generacji fiszek. Zadania te są tworzone asynchronicznie przez system AI i reprezentowane przez podstawowe dane, takie jak: identyfikator (id), status, opcjonalny postęp (progress), data utworzenia (createdAt) oraz identyfikator użytego modelu (modelUsed).

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Struktura URL:** /api/v1/generations
- **Parametry:**
  - **Wymagane:**
    - Nagłówek `Authorization: Bearer <JWT>` do weryfikacji autentyczności.
  - **Opcjonalne:**
    - `page` – numer strony (domyślnie 1).
    - `limit` – liczba elementów na stronę (domyślnie 20, zakres: 1–100).
- **Request Body:** Brak

## 3. Wykorzystywane typy

- **DTO:**
  - `GenerationDTO` – reprezentuje podstawowe dane zadania generacji (id, status, createdAt, updatedAt, modelUsed).
  - `GenerationTaskVM` – widok używany przy zwracaniu listy zadań generacji, zawiera pola: id, status, progress (opcjonalnie), createdAt, modelUsed.
- **Modele Command:**
  - W przypadku endpointu GET nie są wymagane modele komend, gdyż nie następuje modyfikacja stanu.

## 4. Szczegóły odpowiedzi

- **Format odpowiedzi:** JSON
- **Struktura odpowiedzi:**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "status": "pending|processing|completed|failed|accepted|cancelled",
        "progress": number (opcjonalnie),
        "createdAt": "ISO8601",
        "modelUsed": "string"
      },
      ...
    ],
    "pagination": {
         "page": number,
         "limit": number,
         "totalPages": number,
         "totalItems": number
    }
  }
  ```
- **Kody statusu:**
  - `200` – Sukces, lista zadań została zwrócona.
  - `400` – Błędne dane wejściowe (np. nieprawidłowe parametry paginacji).
  - `401` – Brak autoryzacji, token JWT nie został przesłany lub jest nieważny.
  - `500` – Błąd po stronie serwera.

## 5. Przepływ danych

1. Klient wysyła żądanie GET z nagłówkiem `Authorization: Bearer <JWT>` oraz opcjonalnymi parametrami `page` i `limit`.
2. Middleware oraz warstwa autoryzacji weryfikują token JWT i ustanawiają kontekst użytkownika.
3. Kontroler odczytuje parametry zapytania, waliduje ich poprawność oraz przekazuje żądanie do warstwy serwisowej.
4. Warstwa serwisowa wykonuje zapytanie do bazy danych, filtrując rekordy w tabeli `generations` według identyfikatora użytkownika (wg. RLS).
5. Dane są mapowane do formatu `GenerationTaskVM` (np. uzupełnienie pola `progress` jeśli dotyczy).
6. Wynik jest pakowany w strukturę zawierającą dane oraz informacje o paginacji i zwracany z kodem statusu 200.
7. W przypadku wystąpienia błędu odpowiedź zawiera strukturę `ErrorDTO`.

## 6. Względy bezpieczeństwa

- **Autentykacja i autoryzacja:** Weryfikacja tokena JWT oraz zastosowanie polityk RLS w bazie danych, aby użytkownik miał dostęp tylko do własnych zadań.
- **Walidacja:** Parametry `page` i `limit` powinny być walidowane na etapie sprawdzania zapytania (np. czy są liczbami w oczekiwanym zakresie).
- **Transport:** Wymagane użycie HTTPS do zabezpieczenia transmisji danych.
- **Rate Limiting:** Ograniczenie liczby zapytań (np. 60 zapytań na minutę) aby uniknąć przeciążenia.

## 7. Obsługa błędów

- **Błędy walidacji:** Nieprawidłowe parametry zapytania – odpowiedź z kodem 400 i komunikatem w strukturze `ErrorDTO`.
- **Błąd autoryzacji:** Brak lub nieważny token JWT – odpowiedź z kodem 401.
- **Błąd serwera:** Problemy z bazą lub nieoczekiwane wyjątki – odpowiedź z kodem 500.
- **Logowanie błędów:** Kluczowe błędy powinny być logowane do systemu monitorowania, a w razie potrzeby (dla zadań generacji) również zapisywane do tabeli `generation_error_logs`.

## 8. Rozważania dotyczące wydajności

- **Paginacja:** Wykorzystanie mechanizmu limit/offset do ograniczenia liczby zwracanych rekordów.
- **Indeksy:** Upewnienie się, że kolumny takie jak `user_id` oraz `created_at` w tabeli `generations` są indeksowane dla szybkiego filtrowania.
- **Cache:** Rozważenie mechanizmów cache'ujących przy wysokim obciążeniu endpointu.
- **Optymalizacja zapytań:** Tylko niezbędne dane są pobierane z bazy danych i mapowane do odpowiednich typów.

## 9. Etapy wdrożenia

1. **Utworzenie endpointu:** Stworzenie lub aktualizacja pliku `/src/pages/api/v1/generations/index.ts`.
2. **Autoryzacja:** Implementacja weryfikacji tokena JWT i pobieranie kontekstu użytkownika.
3. **Walidacja zapytań:** Dodanie walidacji parametrów `page` oraz `limit`.
4. **Warstwa serwisowa:** Utworzenie/rozszerzenie serwisu w pliku np. `/src/lib/services/generationService.ts` odpowiedzialnego za pobieranie danych z bazy.
5. **Zapytanie do bazy:** Implementacja logiki pobierania rekordów z tabeli `generations` z uwzględnieniem RLS oraz paginacji.
6. **Mapowanie danych:** Przetwarzanie danych z bazy do formatu `GenerationTaskVM`.
7. **Budowa odpowiedzi:** Przygotowanie struktury JSON zawierającej dane oraz informacje o paginacji.
8. **Obsługa błędów i logowanie:** Dodanie mechanizmów logowania błędów i zwracania odpowiednich kodów statusu.
9. **Testy:** Implementacja testów jednostkowych i integracyjnych endpointu.
10. **Przegląd i wdrożenie:** Code review, wdrożenie na środowisko testowe, a następnie produkcyjne.
