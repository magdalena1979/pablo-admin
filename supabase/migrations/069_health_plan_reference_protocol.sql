begin;

alter table public.farm_health_plan_items
  add column reference_product text,
  add column reference_dose text,
  add column reference_schedule text;

-- Datos explícitos de la planilla del plan general. Se conserva la redacción
-- del producto cuando la planilla no indica concentración o presentación.
with reference_data(animal_group, name, product, schedule) as (
  values
    ('Vacas', 'Cobre', 'Cobre', null),
    ('Vacas', 'Ivermectina', 'Ivermectina 3.15', null),
    ('Vacas', 'Doramectina', 'Doramectina', null),
    ('Vacas', 'Fasciolicida', 'Triclabendazol o clorsulon', null),
    ('Vacas', 'Séxtuple clostridial', 'Séxtuple clostridial', null),
    ('Vacas', 'Vacuna contra diarrea neonatal', 'Vacuna contra diarrea neonatal', null),
    ('Vacas', 'Vacuna reproductiva (IBR/DVB)', 'Vacuna reproductiva (IBR/DVB)', null),
    ('Vacas', 'Vacuna reproductiva (IBR/DVB y leptospira)', 'Vacuna reproductiva (IBR/DVB y leptospira)', null),
    ('Terneros al pie', 'Neumonía', null, 'Primera y segunda dosis'),
    ('Terneros al pie', 'Vacuna contra mancha y gangrena', 'Vacuna contra mancha y gangrena', 'Primera y segunda dosis'),
    ('Invernada', 'Cobre', 'Cobre', null),
    ('Invernada', 'Doramectina', 'Doramectina', null),
    ('Invernada', 'Ivermectina', 'Ivermectina', null),
    ('Invernada', 'Fofamizole', 'Fofamizole', null),
    ('Invernada', 'Fasciolicida', 'ivomecf', null),
    ('Invernada', 'Vacuna contra mancha y gangrena (MGE)', 'Vacuna contra mancha y gangrena (MGE)', null),
    ('Invernada', 'Vacuna respiratoria (IBR/DVB y neumonía)', 'Vacuna respiratoria (IBR/DVB y neumonía)', null),
    ('Toros', 'Cobre', 'Cobre', null),
    ('Toros', 'Fasciolicida', 'Triclabendazol o clorsulon (noviembre)', null),
    ('Toros', 'Séxtuple clostridial', 'Séxtuple clostridial', null),
    ('Toros', 'Vacuna reproductiva', 'Vacuna reproductiva', null),
    ('Vaquillonas de primer servicio de otoño', 'Cobre', 'Cobre', null),
    ('Vaquillonas de primer servicio de otoño', 'Ivermectina F', 'Ivermectina F', null),
    ('Vaquillonas de primer servicio de otoño', 'Doramectina', 'Doramectina', null),
    ('Vaquillonas de primer servicio de otoño', 'Fasciolicida', 'Triclabendazol o clorsulon', null),
    ('Vaquillonas de primer servicio de otoño', 'Séxtuple clostridial', 'Séxtuple clostridial', null),
    ('Vaquillonas de primer servicio de otoño', 'Vacuna reproductiva (IBR/DVB)', 'Vacuna reproductiva (IBR/DVB)',
      'Dos dosis con 15–21 días de intervalo. Primera dosis a mediados de septiembre.'),
    ('Vacas paridas de otoño', 'Cobre', 'Cobre', null),
    ('Vacas paridas de otoño', 'Fasciolicida', 'Nitroxinil (septiembre). Triclabendazol o clorsulon (mayo y diciembre).', null),
    ('Vacas paridas de otoño', 'Séxtuple clostridial', 'Séxtuple clostridial', null),
    ('Vacas paridas de otoño', 'Vacuna reproductiva (IBR/DVB)', 'Vacuna reproductiva (IBR/DVB)', null),
    ('Vacas paridas de otoño', 'Vacuna contra diarrea neonatal', 'Vacuna contra diarrea neonatal',
      'Primovacunación: dos dosis con 15 días de intervalo.'),
    ('Terneros de otoño al pie', 'Neumonía', null, 'Primera y segunda dosis'),
    ('Terneros de otoño al pie', 'Vacuna contra mancha y gangrena', 'Vacuna contra mancha y gangrena', 'Primera y segunda dosis'),
    ('Terneros de otoño al pie', 'Ivermectina', 'Ivermectina', null),
    ('Terneros de otoño al pie', 'Ricobendazole', 'Ricobendazole', 'Figura en la nota de la segunda dosis.'),
    ('Terneros de otoño al pie', 'Olivit SE', 'Olivit SE', 'Figura en la nota de la segunda dosis.')
)
update public.farm_health_plan_items p
set reference_product = r.product, reference_schedule = r.schedule
from reference_data r
where p.animal_group = r.animal_group and p.name = r.name and p.archived_at is null;

commit;
