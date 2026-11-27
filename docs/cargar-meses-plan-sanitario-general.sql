-- Meses previstos del plan sanitario general, según las siete hojas del Excel.
-- Ejecutar el bloque completo en Supabase SQL Editor después de la migración 067.
-- Completa trabajos activos existentes con coincidencia única por grupo y nombre.
-- Conserva los meses ya cargados y las asignaciones a establecimientos.
-- Los encabezados del Excel van de febrero a enero; acá enero = 1, diciembre = 12.
-- En terneros, se usan las marcas de 1.ª y 2.ª dosis de las filas agrupadas.
-- El control de diarrea neonatal de terneros al pie usa la franja julio-septiembre.
-- La nota de la segunda dosis de otoño ubica ricobendazole y Olivit SE en julio.
-- La marca «3° dosis» de Invernada queda fuera porque no identifica el trabajo.

with meses(animal_group, name, planned_months) as (
  values
    ('Vacas', 'Boqueo', array[3]::smallint[]),
    ('Vacas', 'Cobre', array[3, 7, 10]::smallint[]),
    ('Vacas', 'Ivermectina', array[7]::smallint[]),
    ('Vacas', 'Doramectina', array[5]::smallint[]),
    ('Vacas', 'Sangrado', array[3]::smallint[]),
    ('Vacas', 'Séxtuple clostridial', array[3, 10]::smallint[]),
    ('Vacas', 'Vacuna contra diarrea neonatal', array[7]::smallint[]),
    ('Vacas', 'Vacuna reproductiva (IBR/DVB)', array[10]::smallint[]),
    ('Vacas', 'Vacuna reproductiva (IBR/DVB y leptospira)', array[3]::smallint[]),
    ('Vacas', 'Aftosa', array[3]::smallint[]),
    ('Vacas', 'Fasciolicida', array[11]::smallint[]),
    ('Vacas', 'Carbunclo', array[11]::smallint[]),
    ('Terneros al pie', 'Neumonía', array[9, 10]::smallint[]),
    ('Terneros al pie', 'Vacuna contra mancha y gangrena', array[9, 10]::smallint[]),
    ('Terneros al pie', 'Control de diarrea neonatal', array[7, 8, 9]::smallint[]),
    ('Terneros al pie', 'Aftosa', array[10]::smallint[]),
    ('Invernada', 'Vacuna contra mancha y gangrena (MGE)', array[2]::smallint[]),
    ('Invernada', 'Vacuna respiratoria (IBR/DVB y neumonía)', array[2]::smallint[]),
    ('Invernada', 'Cobre', array[6, 9]::smallint[]),
    ('Invernada', 'Doramectina', array[6]::smallint[]),
    ('Invernada', 'Carbunclo', array[11]::smallint[]),
    ('Invernada', 'Ivermectina', array[9]::smallint[]),
    ('Invernada', 'Aftosa', array[3, 11]::smallint[]),
    ('Invernada', 'Control integrado de parásitos (HPG y tratamientos)', array[5]::smallint[]),
    ('Invernada', 'Fofamizole', array[4]::smallint[]),
    ('Invernada', 'Séxtuple', array[11]::smallint[]),
    ('Invernada', 'Brucelosis', array[3]::smallint[]),
    ('Invernada', 'Fasciolicida', array[11]::smallint[]),
    ('Toros', 'Séxtuple clostridial', array[4, 9]::smallint[]),
    ('Toros', 'Fasciolicida', array[4, 11]::smallint[]),
    ('Toros', 'Aftosa', array[4]::smallint[]),
    ('Toros', 'Cobre', array[9]::smallint[]),
    ('Toros', 'Carbunclo', array[11]::smallint[]),
    ('Toros', 'Vacuna reproductiva', array[9]::smallint[]),
    ('Toros', 'Control de ectoparásitos', array[1]::smallint[]),
    ('Toros', 'Primer raspaje', array[5]::smallint[]),
    ('Toros', 'Segundo raspaje', array[6]::smallint[]),
    ('Toros', 'Revisación clínica', array[5]::smallint[]),
    ('Vaquillonas de primer servicio de otoño', 'Séxtuple clostridial', array[5, 9]::smallint[]),
    ('Vaquillonas de primer servicio de otoño', 'Fasciolicida', array[12]::smallint[]),
    ('Vaquillonas de primer servicio de otoño', 'Vacuna reproductiva (IBR/DVB)', array[5, 9]::smallint[]),
    ('Vaquillonas de primer servicio de otoño', 'Cobre', array[9]::smallint[]),
    ('Vaquillonas de primer servicio de otoño', 'Carbunclo', array[12]::smallint[]),
    ('Vaquillonas de primer servicio de otoño', 'Ivermectina F', array[5]::smallint[]),
    ('Vaquillonas de primer servicio de otoño', 'Aftosa', array[12]::smallint[]),
    ('Vaquillonas de primer servicio de otoño', 'Doramectina', array[3]::smallint[]),
    ('Vacas paridas de otoño', 'Fasciolicida', array[5, 9, 12]::smallint[]),
    ('Vacas paridas de otoño', 'Carbunclo', array[12]::smallint[]),
    ('Vacas paridas de otoño', 'Cobre', array[2, 10]::smallint[]),
    ('Vacas paridas de otoño', 'Séxtuple clostridial', array[10]::smallint[]),
    ('Vacas paridas de otoño', 'Aftosa', array[12]::smallint[]),
    ('Vacas paridas de otoño', 'Vacuna contra diarrea neonatal', array[2]::smallint[]),
    ('Vacas paridas de otoño', 'Vacuna reproductiva (IBR/DVB)', array[10]::smallint[]),
    ('Terneros de otoño al pie', 'Neumonía', array[6, 7]::smallint[]),
    ('Terneros de otoño al pie', 'Vacuna contra mancha y gangrena', array[6, 7]::smallint[]),
    ('Terneros de otoño al pie', 'Ivermectina', array[10]::smallint[]),
    ('Terneros de otoño al pie', 'Olivit SE', array[7, 10]::smallint[]),
    ('Terneros de otoño al pie', 'Ricobendazole', array[7]::smallint[]),
    ('Terneros de otoño al pie', 'Aftosa', array[10]::smallint[]),
    ('Terneros de otoño al pie', 'Brucelosis en hembras', array[10]::smallint[])
), coincidencias as (
  select m.animal_group, m.name, m.planned_months,
    count(p.id) as coincidencias,
    (array_agg(p.id) filter (where p.id is not null))[1] as id
  from meses m
  left join public.farm_health_plan_items p
    on lower(trim(p.animal_group)) = lower(m.animal_group)
    and lower(trim(p.name)) = lower(m.name)
    and p.archived_at is null
  group by m.animal_group, m.name, m.planned_months
), actualizados as (
  update public.farm_health_plan_items p
  set planned_months = c.planned_months
  from coincidencias c
  where c.coincidencias = 1 and p.id = c.id
    and p.archived_at is null and cardinality(p.planned_months) = 0
  returning p.id
)
select c.animal_group as grupo, c.name as trabajo, c.planned_months as meses_del_excel,
  case
    when c.coincidencias = 0 then 'Sin coincidencia activa'
    when c.coincidencias > 1 then 'Coincidencia múltiple: revisar'
    when a.id is not null then 'Meses cargados'
    else 'Meses existentes conservados'
  end as resultado
from coincidencias c
left join actualizados a on a.id = c.id
order by grupo, trabajo;
