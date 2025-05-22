# Architektura UI dla 10X Cards (MVP)

## 1. Przegląd struktury UI

Minimalistyczna, ciemna (dark-mode only) aplikacja SPA oparta o Astro 5 + React 19. Po zalogowaniu użytkownik trafia bezpośrednio na widok "Generuj fiszki AI". Globalna ramka UI składa się z:
• lewego panelu nawigacyjnego (persistent drawer) z głównymi sekcjami,
• nagłówka z akcjami sesji (avatar, logout),
• obszaru treści routowanego (client-side router React-Router),
• globalnych komponentów pomocniczych: toast/alert stack, modal root, spinner overlay.

## 2. Lista widoków

**Logowanie**  
Ścieżka: `/login`  
Cel: Uwierzytelnienie użytkownika  
Kluczowe dane: Form fields: email, password; link "Reset"  
Komponenty: `Form`, `Input`, `Button`, `Alert`  
UX/A11y/Security: Focus management; aria-labels; brakuje JWT → zapis w pamięci; po sukcesie redirect.

**Rejestracja**  
Ścieżka: `/signup`  
Cel: Założenie konta  
Kluczowe dane: Email, password  
Komponenty: `Form`, `Alert`  
UX/A11y/Security: Walidacja inline; link do loginu.

**Reset hasła (request)**  
Ścieżka: `/reset`  
Cel: Wysłanie maila resetującego  
Kluczowe dane: Email  
Komponenty: `Form`, `Alert`  
UX/A11y/Security: -

**Reset hasła (confirm)**  
Ścieżka: `/reset/confirm/:token`  
Cel: Ustawienie nowego hasła  
Kluczowe dane: Password, confirm  
Komponenty: `Form`  
UX/A11y/Security: token w URL; walidacja.

**Generuj AI**  
Ścieżka: `/generate`  
Cel: Główne wejście po loginie; przesyłanie tekstu do AI  
Kluczowe dane: TextArea, model select, category select, lista statusów  
Komponenty: `Textarea`, `Select`, `Button`, `ProgressBar`, `Spinner`, `Alert`  
UX/A11y/Security: Auto-focus; SSE/polling status; aria-live dla postępu.

**Podgląd wygenerowanych**  
Ścieżka: (Modal internal)  
Cel: Preview/edycja pojedynczej wygenerowanej fiszki  
Kluczowe dane: Pytanie, odpowiedź, checkbox accept  
Komponenty: `Modal`, `Input`, `Textarea`, `Checkbox`, `Button`  
UX/A11y/Security: Focus trap; esc close; form validation.

**Lista fiszek**  
Ścieżka: `/flashcards`  
Cel: Przegląd, wyszukiwanie, filtrowanie  
Kluczowe dane: Lista FlashcardDTO  
Komponenty: `InfiniteList`, `FlashcardRow`, `Spinner`, `Alert`, `DropdownFilter`  
UX/A11y/Security: Infinite scroll, observer 25 %; role="list"; aria-busy.

**Edycja fiszki**  
Ścieżka: (Modal)  
Cel: Modyfikacja pytania/odpowiedzi/kategorii  
Kluczowe dane: Form z pre-filled values  
Komponenty: `Modal`, `Input`, `Textarea`, `Select`, `Button`  
UX/A11y/Security: Validation; focus trap; optimistic update.

**Kategorie**  
Ścieżka: `/categories`  
Cel: CRUD kategorii  
Kluczowe dane: Tabela kategorii  
Komponenty: `Table`, `ModalCreate`, `ModalEdit`, `ConfirmDialog`  
UX/A11y/Security: Po delete fiszki pozostają bez kategorii – aktualizacja listy.

**Admin – użytkownicy**  
Ścieżka: `/admin/users`  
Cel: Lista kont + reset/usuń  
Kluczowe dane: Tabela users  
Komponenty: `Table`, `SearchInput`, `ConfirmDialog`, `Alert`  
UX/A11y/Security: Dostęp tylko dla roli admin (guard route); audyt log w tle.

**Profil / ustawienia**  
Ścieżka: `/settings`  
Cel: Wylogowanie, info o koncie  
Kluczowe dane: Avatar, email  
Komponenty: `Button`, `Alert`  
UX/A11y/Security: Logout usuwa tokeny z pamięci; brak edycji motywu.

## 3. Mapa podróży użytkownika

1. Użytkownik anonimowy → `/login` → loguje się → redirect `/generate`.
2. W widoku "Generuj AI" wkleja tekst → `POST /generations` → spinner + alert success.
3. Po statusie `completed` (SSE/polling) otwiera modal z listą sugerowanych fiszek → edycja pojedyncza → zaznacza/odznacza → "Akceptuj" → `POST /generations/{id}/accept`.
4. Redirect `/flashcards?source=ai&sortBy=createdAt` z listą właśnie dodanych.
5. Przewijanie listy ładuje kolejne strony (`GET /flashcards?page=…`); edycja inline w modalu; delete opcjonalnie.
6. Boczne menu → "Kategorie" → tworzy/usuwa kategorię → lista fiszek aktualizuje się live.
7. (Admin) Użytkownik z rolą admin wybiera "Użytkownicy" → widzi tabelę → akcje reset/usuń z potwierdzeniem.

## 4. Układ i struktura nawigacji

```
<AppShell>
 ├─ <SideNav>
 │    • AI Generator
 │    • Flashcards
 │    • Categories
 │    • (Admin) Users
 ├─ <Header>
 │    • Logo • Spacer • SpinnerOverlay • UserMenu
 └─ <Outlet/>  (React Router)
```

• SideNav wysuwa się w trybie mobile (hamburger).  
• Bread-crumb w nagłówku opcjonalnie.  
• Global <ModalRoot> i <ToastStack> montowane pod AppShell.

## 5. Kluczowe komponenty

- `InfiniteList` – hook intersection observer, pobiera kolejne strony przez TanStack Query.
- `FlashcardRow` – zwijany wiersz z pytaniem, skrótem odpowiedzi, ikonami edit/delete.
- `Modal` – dostęp z Radix Dialog; focus trap; role="dialog".
- `Form` – React Hook Form + Zod resolver, komunikaty błędów w `Alert`.
- `Spinner` – animacja Tailwind `animate-spin` dla globalnych i lokalnych ładowań.
- `ConfirmDialog` – potwierdzenie usunięć (fiszek, kategori, user).
- `Alert` – shadcn/ui `Alert` z wariantami `error|success`.
- `ProgressBar` – status generacji.
- `SideNav`, `Header`, `AvatarMenu`.
- `DropdownFilter` – kategoria, source, sort, search.

## 6. Mapowanie historyjek użytkownika → UI

| US-ID      | Ekran / Komponenty                                                |
| ---------- | ----------------------------------------------------------------- |
| US-001     | AI Generator + ProgressBar + Modal Preview + AcceptGeneratedCards |
| US-002     | Modal Create Flashcard                                            |
| US-003     | Flashcards List + Modal Edit                                      |
| US-004     | Categories View + DropdownFilter                                  |
| US-005     | Flashcards List + SearchInput + InfiniteList                      |
| US-006/007 | Login / Signup Forms + Redirect logic                             |
| US-008     | Reset Password screens                                            |

## 7. Edge-cases & błędy

- Brak wyników search → pusty stan z linkiem "Utwórz fiszkę".
- Błąd 401 globalny → redirect `/login`.
- Błąd sieci podczas infinite scroll → toast error i przycisk "Spróbuj ponownie".
- Usunięta kategoria → flashcards list refresh (`categoryId=null` tag).

## 8. Zgodność z API

- `/flashcards` GET – infinite scroll, filtry, sort.
- `/flashcards` POST – modal create.
- `/flashcards/{id}` PATCH – modal edit.
- `/categories` CRUD dla widoku kategorii.
- `/generations` + `/generations/{id}` + `/accept` – AI workflow.
- `/admin/users` – admin table.

## 9. Bezpieczeństwo i dostępność

- Wszystkie modale trap focus; aria-labelledby/aria-describedby.
- JWT w pamięci; interceptor dodaje nagłówek; refresh token flow TBD.
- Brak lokalnego cache offline (Service Worker disabled).
- Minimalny kontrast 4.5:1; test Lighthouse; tryb dark default.
