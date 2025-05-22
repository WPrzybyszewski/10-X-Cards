-- Tabela generations do przechowywania zadań generowania fiszek
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  source_text text not null check (length(source_text) between 1000 and 10000),
  model_used text not null,
  progress integer check (progress between 0 and 100),
  category_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indeksy dla optymalizacji zapytań
create index if not exists generations_user_id_idx on public.generations(user_id);
create index if not exists generations_created_at_idx on public.generations(created_at desc);
create index if not exists generations_status_idx on public.generations(status);

-- Trigger do automatycznej aktualizacji updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_generations_updated_at
  before update on public.generations
  for each row
  execute function public.handle_updated_at();

-- RLS policies
alter table public.generations enable row level security;

create policy "Users can view their own generations"
  on public.generations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own generations"
  on public.generations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own generations"
  on public.generations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tabela na logi błędów
create table if not exists public.generation_error_logs (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  error_message text not null,
  error_details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists generation_error_logs_generation_id_idx 
  on public.generation_error_logs(generation_id);

-- RLS dla logów błędów
alter table public.generation_error_logs enable row level security;

create policy "Users can view error logs for their generations"
  on public.generation_error_logs for select
  using (
    exists (
      select 1 from public.generations
      where generations.id = generation_error_logs.generation_id
      and generations.user_id = auth.uid()
    )
  ); 