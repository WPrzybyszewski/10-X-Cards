# API Endpoint Implementation Plan: POST /auth/signup

## 1. Przegląd punktu końcowego

Umożliwia rejestrację nowego użytkownika. Endpoint przyjmuje dane (email oraz hasło) i tworzy nowe konto użytkownika korzystając z mechanizmu autentykacji Supabase. W przypadku sukcesu zwraca token autoryzacyjny (accessToken oraz opcjonalnie refreshToken).

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** /api/v1/auth/signup
- **Nagłówki:**
  - Content-Type: application/json
- \*\*Parametry:
  - Wymagane w ciele żądania:\*\*
    - email (string)
    - password (string)

**Przykładowe body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

## 3. Wykorzystywane typy

- **DTO i Command Modele:**
  - `SignupCommand` – definiowany w `src/types.ts` (zawiera `email` oraz `password`)
  - `AuthTokenDTO` – reprezentuje tokeny JWT zwracane po pomyślnej rejestracji

## 4. Szczegóły odpowiedzi

- **Sukces:**
  - **Kod statusu:** 201 Created (alternatywnie 200 OK, w zależności od decyzji architektonicznej)
  - **Body:** Obiekt typu `AuthTokenDTO`, przykładowo:
    ```json
    {
      "accessToken": "string",
      "refreshToken": "string"
    }
    ```
- **Błędy:**
  - 400 – Nieprawidłowe dane wejściowe (np. brak wymaganych pól, niepoprawny format email)
  - 409 – Konflikt: użytkownik z podanym emailem już istnieje
  - 500 – Błąd po stronie serwera

## 5. Przepływ danych

1. Endpoint odbiera żądanie rejestracji wysłane do `/api/v1/auth/signup`.
2. Treść żądania jest parsowana i walidowana przy użyciu schematu Zod (opartego na `SignupCommand`).
3. Wywoływana jest metoda `signup` w usłudze autoryzacyjnej (AuthService), która komunikuje się z Supabase Auth w celu rejestracji nowego użytkownika.
4. W przypadku powodzenia, otrzymujemy obiekt zawierający tokeny autoryzacyjne, które są przekazywane w odpowiedzi do klienta.
5. W przypadku wystąpienia błędów (np. duplikat email), endpoint zwraca odpowiedni komunikat błędu wraz z właściwym kodem statusu.

## 6. Względy bezpieczeństwa

- **Walidacja danych:** Użycie Zod do walidacji pól `email` i `password`.
- **Sanityzacja:** Trimowanie wartości `email`, walidacja formatu emaila.
- **Rate Limiting:** Ograniczenie częstotliwości żądań, aby zapobiec atakom brute-force.
- **Przechowywanie hasła:** Hasło musi być bezpiecznie przesyłane (HTTPS) i nigdy nie zapisywane w postaci jawnej.
- **Supabase Auth:** Wykorzystanie wbudowanych mechanizmów bezpieczeństwa Supabase.

## 7. Obsługa błędów

- **400 Bad Request:** Gdy dane wejściowe nie spełniają wymagań walidacji.
- **409 Conflict:** Gdy użytkownik o podanym emailu już istnieje.
- **500 Internal Server Error:** W przypadku nieprzewidzianych błędów lub problemów z Supabase.
- Wszystkie błędy powinny być logowane i zwracane w jednolitym formacie `ErrorDTO`.

## 8. Rozważania dotyczące wydajności

- Endpoint nie wykonuje operacji intensywnych obliczeniowo, jednak rate limiting jest wymagany, aby chronić przed atakami brute-force.
- Supabase zapewnia skalowalność i wysoką wydajność przy operacjach związanych z autentykacją.

## 9. Etapy wdrożenia

1. **Zdefiniowanie schematu walidacji:** Utworzenie Zod Schema dla `SignupCommand` w `src/lib/validators/auth.ts`.
2. **Implementacja usługi:** Utworzenie lub rozszerzenie `AuthService` w `src/lib/services/auth.service.ts` z metodą `signup` komunikującą się z Supabase Auth.
3. **Endpoint API:** Utworzenie pliku `/src/pages/api/v1/auth/signup.ts`:
   - Parsowanie żądania i walidacja danych przy użyciu Zod.
   - Wywołanie `AuthService.signup` z przekazanymi danymi.
   - Obsługa odpowiedzi i ewentualnych błędów.
4. **Middleware:** Dodanie warstwy rate limiting oraz weryfikacji nagłówków (Content-Type itp.).
5. **Testy:** Opracowanie testów integracyjnych dla endpointu, sprawdzających scenariusze sukcesu oraz błędów.
6. **Dokumentacja:** Aktualizacja dokumentacji OpenAPI oraz README, aby odzwierciedlały nowy endpoint.
