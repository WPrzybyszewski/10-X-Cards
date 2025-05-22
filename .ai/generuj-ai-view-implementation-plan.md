# Plan implementacji widoku „Generuj AI”

## 1. Przegląd

Widok „Generuj AI” umożliwia użytkownikowi wklejenie fragmentu tekstu (np. artykułu, notatek) i zlecenie wygenerowania fiszek pytanie–odpowiedź z wykorzystaniem modelu LLM. To główny punkt wejścia po zalogowaniu, a jego celem jest uproszczenie procesu tworzenia fiszek oraz prezentacja statusu zadań generacyjnych w czasie rzeczywistym.

## 2. Routing widoku

`/generate` – trwale dostępny po zalogowaniu, osadzony w layoucie `AppShell` (SideNav + Header + Outlet).

## 3. Struktura komponentów

```
<GeneratePage>
 ├─ <GenerateForm>
 │    ├─ <Textarea name="sourceText" />
 │    ├─ <ModelSelect name="model" />
 │    ├─ <CategorySelect name="categoryId" />
 │    └─ <Button type="submit">Generuj</Button>
 ├─ <AlertStack />            ← globalny system komunikatów
 └─ <GenerationTaskList>
      ├─ <GenerationTaskItem />
      ├─ …
      └─ <EmptyState />
```

## 4. Szczegóły komponentów

### 4.1 GeneratePage

- **Opis**: Komponent‐kontener odpowiedzialny za pobranie danych pomocniczych (modele, kategorie, lista zadań) i renderowanie formularza oraz listy zadań.
- **Główne elementy**: `GenerateForm`, `GenerationTaskList`, `AlertStack`.
- **Obsługiwane interakcje**: przekazywanie callbacków do podkomponentów; reakcja na mutate sukces/error.
- **Walidacja**: brak bezpośredniej; delegowana do `GenerateForm`.
- **Typy**: `GenerationDTO[]`, `CategoryDTO[]`, `ModelOption`.
- **Propsy**: brak (mountowany bezpośrednio przez router).

### 4.2 GenerateForm

- **Opis**: Formularz wysyłki tekstu do AI; korzysta z React Hook Form + Zod.
- **Główne elementy**: `Textarea`, `Select` × 2, `Button`.
- **Obsługiwane interakcje**:
  - `onSubmit` → wywołuje mutację POST `/generations`.
  - Zmiana pól formularza.
- **Walidacja**:
  - `sourceText`: wymagany, `minLength ≥ 20` znaków.
  - `model`: wymagany (domyślnie z env `DEFAULT_MODEL`).
  - `categoryId`: opcjonalny, ale jeśli wybrany musi istnieć na liście kategorii.
- **Typy**: `SubmitGenerationCommand` (z `types.ts`).
- **Propsy**: `{ onSuccess: (generation: GenerationDTO) => void }`.

### 4.3 ModelSelect

- **Opis**: Dropdown z listą dostępnych modeli.
- **Główne elementy**: `Select` z opcjami.
- **Obsługiwane interakcje**: wybór modelu.
- **Walidacja**: wartość musi być jednym z `ModelOption.value`.
- **Typy**: `ModelOption` → `{ label: string; value: string }`.
- **Propsy**: standardowe propsy kontrolowanego pola RHF.

### 4.4 CategorySelect

- **Opis**: Dropdown z kategoriami należącymi do użytkownika.
- **Główne elementy**: `Select`.
- **Obsługiwane interakcje**: wybór kategorii lub brak.
- **Walidacja**: jeśli wartość ≠ "" musi istnieć w `CategoryDTO`.
- **Typy**: `CategoryDTO`.
- **Propsy**: j.w.

### 4.5 GenerationTaskList

- **Opis**: Lista wszystkich zadań generacyjnych użytkownika (pobranych z `/generations`).
- **Główne elementy**: kolekcja `GenerationTaskItem`, `EmptyState`.
- **Obsługiwane interakcje**: brak (pasywna wizualizacja) + emitowanie eventu przy kliknięciu elementu.
- **Walidacja**: brak.
- **Typy**: `GenerationDTO[]`.
- **Propsy**: `{ tasks: GenerationTaskVM[] }`.

### 4.6 GenerationTaskItem

- **Opis**: Pojedyncza karta zadania z nazwą statusu, paskiem postępu i przyciskiem „Podgląd / Akceptuj”.
- **Główne elementy**: `ProgressBar` / `Spinner`, status text, opcjonalny przycisk‐link.
- **Obsługiwane interakcje**:
  - Klik „Podgląd / Akceptuj” → `navigate(/generations/{id})` (osobny ekran / modal poza zakresem).
- **Walidacja**: brak.
- **Typy**: `GenerationTaskVM` (patrz sekcja Typy).
- **Propsy**: `{ task: GenerationTaskVM }`.

## 5. Typy

```ts
// Zbiór nowych/rozszerzonych typów dla widoku
export interface ModelOption {
  label: string
  value: string
}

export interface GenerationTaskVM {
  id: string
  status: GenerationStatus
  progress?: number // optional % (SSE/polling)
  createdAt: string
  modelUsed: string
}
```

- `GenerationTaskVM` powstaje z `GenerationDTO`, rozszerzony o pole `progress` obliczane lokalnie.

## 6. Zarządzanie stanem

- **React Hook Form** do przechowywania i walidacji pól formularza.
- **TanStack Query**:
  - `useQuery('categories')` → `GET /categories` (współdzielone).
  - `useQuery('generations')` → `GET /generations` (odświeżane co 30 s).
  - `useMutation('submitGeneration')` → `POST /generations`.
- **Custom hook `useGenerationProgress(id)`** – otwiera SSE (`/generations/{id}`) i emituje eventy `progress`, `completed`, `failed`.
- **Context/Provider** nie jest konieczny – stan lokalny na poziomie widoku.

## 7. Integracja API

| Akcja             | HTTP | Endpoint            | Typ żądania               | Typ odpowiedzi                          |
| ----------------- | ---- | ------------------- | ------------------------- | --------------------------------------- |
| Submit generation | POST | `/generations`      | `SubmitGenerationCommand` | `GenerationDTO` (202)                   |
| List tasks        | GET  | `/generations`      | –                         | `GenerationDTO[]`                       |
| SSE / Poll status | GET  | `/generations/{id}` | –                         | `text/event-stream` lub `GenerationDTO` |

> Używamy nagłówka `Accept: text/event-stream` dla SSE. Przy braku SSE (np. dev proxy) fallback do polling co 5 s.

## 8. Interakcje użytkownika

1. Użytkownik ląduje na `/generate`, kursor automatycznie w `Textarea`.
2. Wkleja tekst, opcjonalnie wybiera model i kategorię.
3. Klik „Generuj”:
   - Formularz waliduje dane.
   - Przy sukcesie: alert _success_, dodanie nowego wpisu w `GenerationTaskList`.
4. Task ze statusem `processing` wyświetla `ProgressBar`.
5. Po statusie `completed` przycisk „Podgląd / Akceptuj” staje się aktywny.

## 9. Warunki i walidacja

- **Textarea**: min 20 znaków.
- **ModelSelect**: musi istnieć w `ModelOption`.
- **CategorySelect**: jeśli ustawione, `categoryId` ∈ `CategoryDTO.id`.
- Przy wysłaniu formularza blokujemy kolejne wysyłki do czasu zakończenia mutacji.

## 10. Obsługa błędów

| Scenariusz              | UI Reakcja                                       |
| ----------------------- | ------------------------------------------------ |
| 400 – walidacja backend | Highlight field, alert _error_ z opisami pól     |
| 401 – brak JWT          | Redirect `/login` + toast „Zaloguj się ponownie” |
| 500 – serwer            | Toast error + możliwość ponownej próby           |
| SSE rozłączenie         | Fallback polling, toast info                     |

## 11. Kroki implementacji

1. Utwórz plik strony `src/pages/generate.astro` i osadź `GeneratePage`.
2. Zaimplementuj typy `ModelOption`, `GenerationTaskVM` w `src/types.ts` (jeśli globalne) lub lokalnym pliku widoku.
3. Zbuduj komponent `GenerateForm` z React Hook Form + Zod.
4. Skonfiguruj `useMutation` na `/generations` i obsłuż success/error.
5. Dodaj `useQuery` dla listy kategorii i zadań.
6. Zaimplementuj `GenerationTaskList` i `GenerationTaskItem` z Tailwind + shadcn/ui.
7. Stwórz custom hook `useGenerationProgress` i zaktualizuj VM przy zdarzeniach SSE.
8. Zapewnij testy jednostkowe walidacji formularza i hooka progresu.
9. Dodaj aria-atributy (`aria-live`, role="progressbar") i testy a11y (Lighthouse).
10. Przeprowadź code review, upewnij się, że ESLint/Prettier przechodzą bez błędów.
11. Zdeployuj na środowisko staging i wykonaj testy end-to-end (Cypress) dla ścieżki US-001.
