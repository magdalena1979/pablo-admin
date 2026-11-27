alter table public.farms
  add column livestock_activities text[] not null default '{}',
  add column primary_livestock_activity text,
  add constraint farms_livestock_activities_valid check (
    livestock_activities <@ array['cria', 'recria', 'terminacion']::text[]
    and array_position(livestock_activities, null) is null
    and cardinality(livestock_activities) =
      ('cria' = any(livestock_activities))::int +
      ('recria' = any(livestock_activities))::int +
      ('terminacion' = any(livestock_activities))::int
    and (
      (cardinality(livestock_activities) = 0 and primary_livestock_activity is null)
      or (primary_livestock_activity is not null and primary_livestock_activity = any(livestock_activities))
    )
  );
