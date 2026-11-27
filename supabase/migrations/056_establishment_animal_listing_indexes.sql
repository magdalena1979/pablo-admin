create index if not exists animals_establishment_page_idx
  on public.animals (farm_id, tag_number, id)
  where active = true and reverted_at is null;

create index if not exists livestock_import_rows_animal_readings_idx
  on public.livestock_import_rows (animal_id, id)
  where result in ('NUEVO', 'EXISTENTE');
