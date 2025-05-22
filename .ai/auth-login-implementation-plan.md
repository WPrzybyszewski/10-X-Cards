# API Endpoint Implementation Plan: POST /auth/login

## 1. Przegląd punktu końcowego

Endpoint pozwala istniejącemu użytkownikowi zalogować się przy użyciu adresu e-mail i hasła. Po pomyślnym uwierzytelnieniu zwracany jest token JWT (oraz opcjonalnie refresh token), dzięki czemu klient może wykonywać kolejne autoryzowane żądania.

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **URL:** `/api/v1/auth/login`
- **Parametry URL:** brak
- **Request Body (JSON):**
  ```json
  {
    "email": "user@example.com",
    "password": "Str0ngP@ssw0rd!"
  }
  ```
  - **email** (string) – wymagany, poprawny format e-mail
  - **password** (string) – wymagany, min 8 znaków

## 3. Wykorzystywane typy

| Nazwa                | Lokalizacja                  |
| -------------------- | ---------------------------- |
| `LoginCommand`       | `src/types.ts`               |
| `LoginCommandSchema` | `src/lib/validators/auth.ts` |
| `AuthTokenDTO`       | `src/types.ts`               |

## 4. Szczegóły odpowiedzi

- **Kod sukcesu:** 200 OK
- **Body (`AuthTokenDTO`):**
  ```json
  {
    "accessToken": "<jwt>",
    "refreshToken": "<optional_refresh>"
  }
  ```
- **Nagłówki dodatkowe:** brak (chyba że zdecydujemy się ustawić httpOnly cookie)

## 5. Przepływ danych

1. Endpoint odbiera JSON z danymi logowania.
2. Walidacja wejścia (`LoginCommandSchema`).
3. Wywołanie `supabase.auth.signInWithPassword({ email, password })`.
4. Obsługa błędów uwierzytelnienia (`Invalid login credentials`).
5. Po sukcesie pobranie `session.access_token` i `refresh_token`.
6. Zwrócenie **200 OK** z `AuthTokenDTO`.

## 6. Względy bezpieczeństwa

- **Rate limiting / brute-force:** Ograniczenie liczby prób logowania z jednego IP.
- **Timing attack mitigation:** Supabase obsługuje, ale należałoby dodać jednolite czasy odpowiedzi.
- **HTTPS:** Wymóg TLS.
- **Account lockout policy:** poza MVP, ale wart uwagi.

## 7. Obsługa błędów

| Kod | Scenariusz                    | `ErrorDTO.code`         |
| --- | ----------------------------- | ----------------------- |
| 400 | Walidacja danych wejściowych  | `VALIDATION_ERROR`      |
| 401 | Nieprawidłowy email lub hasło | `INVALID_CREDENTIALS`   |
| 429 | Zbyt wiele prób               | `TOO_MANY_REQUESTS`     |
| 500 | Błąd Supabase / serwera       | `INTERNAL_SERVER_ERROR` |

## 8. Rozważania dotyczące wydajności

- Operacja pojedyncza; kluczowe jest caching JWT po stronie klienta, nie po stronie serwera.

## 9. Etapy wdrożenia

1. **Validator:** `LoginCommandSchema` (email format, password non-empty).
2. **Service:** Metoda `login(command)` w `AuthService` (`src/lib/services/auth.service.ts`).
3. **Endpoint:** `src/pages/api/v1/auth/login.ts` – handler `POST`.
4. **Tests:** Jednostkowe (validator), integracyjne (happy path, wrong password, rate limit trigger).
5. **OpenAPI:** Uzupełnienie spec.
6. **CI/CD:** Dodać testy.
7. **Monitoring & alerting:** monitor nieudanych prób logowania i wskaźników rate limit.
