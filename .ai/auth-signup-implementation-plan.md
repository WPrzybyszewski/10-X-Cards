# API Endpoint Implementation Plan: POST /auth/signup

## 1. Przegląd punktu końcowego

Endpoint umożliwia rejestrację nowego użytkownika w systemie za pomocą adresu e-mail i hasła. Po pomyślnym utworzeniu konta zwracany jest token JWT (oraz opcjonalnie refresh token), dzięki któremu użytkownik może natychmiast uzyskać autoryzowany dostęp do pozostałych zasobów API.

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **URL:** `/api/v1/auth/signup`
- **Parametry URL:** brak
- **Request Body (JSON):**
  ```json
  {
    "email": "user@example.com",
    "password": "Str0ngP@ssw0rd!"
  }
  ```
  - **email** (string) – wymagany, poprawny format RFC 5322, max 255 znaków
  - **password** (string) – wymagany, min 8 znaków, zawiera litery i cyfry

## 3. Wykorzystywane typy

| Nazwa                 | Lokalizacja                  |
| --------------------- | ---------------------------- |
| `SignupCommand`       | `src/types.ts`               |
| `SignupCommandSchema` | `src/lib/validators/auth.ts` |
| `AuthTokenDTO`        | `src/types.ts`               |
| Supabase `User`       | `@supabase/supabase-js`      |

## 4. Szczegóły odpowiedzi

- **Kod sukcesu:** 201 Created
- **Body (`AuthTokenDTO`):**
  ```json
  {
    "accessToken": "<jwt>",
    "refreshToken": "<optional_refresh>"
  }
  ```
- **Nagłówki dodatkowe:** brak (cookies zarządza FE/klient)

## 5. Przepływ danych

1. Endpoint odbiera JSON z danymi rejestracyjnymi.
2. Walidacja danych wejściowych (`SignupCommandSchema`).
3. Wywołanie Supabase Auth Admin API (service role key) lub `supabase.auth.signUp`:
   ```ts
   const { data, error } = await supabase.auth.signUp({ email, password })
   ```
4. Obsługa potencjalnego błędu `User already registered` (duplicate email).
5. Po sukcesie pobranie `session.access_token` i `refresh_token`.
6. Zwrócenie **201 Created** wraz z `AuthTokenDTO`.

## 6. Względy bezpieczeństwa

- **Rate limiting:** zapobiega tworzeniu wielu kont przez tego samego klienta/IP.
- **Password policy:** enforce min length & complexity w Supabase lub wstępna walidacja.
- **Service role secrets:** endpoint wywołuje publiczne `auth.signUp`, więc nie musi używać role key, ale upewnić się, że nie wystawiamy sekretnych kluczy.
- **HTTPS only:** tokeny przesyłane wyłącznie po TLS.

## 7. Obsługa błędów

| Kod | Scenariusz                              | `ErrorDTO.code`         |
| --- | --------------------------------------- | ----------------------- |
| 400 | Walidacja email/hasło nie powiodła się  | `VALIDATION_ERROR`      |
| 409 | Użytkownik o podanym email już istnieje | `CONFLICT`              |
| 422 | Nie spełniono polityki haseł            | `UNPROCESSABLE`         |
| 429 | Limit rejestracji / brute-force         | `TOO_MANY_REQUESTS`     |
| 500 | Błąd Supabase / serwera                 | `INTERNAL_SERVER_ERROR` |

## 8. Rozważania dotyczące wydajności

- Operacja pojedyncza – niski koszt; głównym aspektem jest ochrona przed spamem (rate-limit, captcha v2).

## 9. Etapy wdrożenia

1. **Validator:** `SignupCommandSchema` (email regex, min password length).
2. **Service:** `AuthService` (`src/lib/services/auth.service.ts`) z metodą `signup(command)`.
3. **Endpoint:** `src/pages/api/v1/auth/signup.ts`:
   - `export const POST` – wywołuje `AuthService.signup`.
4. **Tests:**
5. **OpenAPI:** uzupełnić spec.
6. **CI/CD:** dodać testy do pipeline.
7. **Monitoring:** log rate limit & błędy Supabase.
