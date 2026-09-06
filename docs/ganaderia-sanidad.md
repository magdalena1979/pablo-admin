# Ganadería y Sanidad

## Modelo incorporado

La migración `035_livestock_traceability_and_gallagher.sql` reutiliza `farms`, `animals`, `herds`, `livestock_categories` y `health_events`.

- `animals`: agrega EID normalizado/original, raza, estado y fecha de actualización. La clave continúa siendo el UUID interno.
- `animal_events`: timeline extensible por animal. `source` identifica `manual`, `gallagher` u otro proveedor futuro; `metadata` conserva datos no estructurados del evento.
- `livestock_imports`: cabecera auditable de cada archivo, con proveedor, SHA-256, usuario y contadores.
- `livestock_import_rows`: resultado y datos originales de cada fila importada.
- `health_event_animals`: relación N:N para aplicar una actividad sanitaria a varios animales sin duplicar el tratamiento.

Todas las tablas nuevas tienen RLS. Las policies usan `can_access_farm` para lectura y `can_manage_farm` para escritura. La función de importación vuelve a validar el permiso y se ejecuta con los privilegios del usuario (`security invoker`).

## Importador Gallagher

1. Aplicar las migraciones de Supabase.
2. Ingresar, seleccionar un establecimiento y abrir **Ganadería → Importar desde Gallagher**.
3. Seleccionar `2026-06-30 MADRE TERNERO OTONO 3006.csv`.
4. Revisar la vista previa. El archivo real contiene 132 filas, 132 EID únicos y ninguna fecha/EID vacíos.
5. Confirmar. La escritura ocurre recién en este paso y en una única transacción RPC.
6. Abrir **Hacienda**, buscar la caravana `1156` o el EID `032010006501156` y consultar su ficha. El evento indica Gallagher y el archivo de origen.

El parser tolera campos vacíos, CSV con comillas, BOM, columna final vacía y encabezados por alias. El EID se compara sin espacios ni signos. Un hash SHA-256 impide reprocesar el mismo archivo para un mismo establecimiento; `EID + fecha` evita repetir lecturas. Los conflictos de caravana no se corrigen silenciosamente.

El flujo actual es **archivo → mapeo → jornada y contexto → preview → confirmación**. Detecta delimitador y encoding, no depende del orden de columnas y centraliza los aliases en `import-engine/field-catalog.ts`. Una columna desconocida queda en “Ignorar esta columna” y no hace fallar el archivo. Los mappings pueden guardarse por proveedor y firma de encabezados después de confirmar; aun cuando exista una plantilla, siempre se muestra para revisión.

La importación puede crear una jornada en borrador, asociarse a una existente o continuar sin jornada. Si alguna fila no tiene fecha se exige una fecha explícita; nunca se usa la fecha de importación como reemplazo silencioso. `Draft Group` se aplica como rodeo explícito y no confirma por sí mismo ninguna categoría inferida.

### Contexto inferido del nombre

El nombre original se analiza como fuente auxiliar. Se detectan palabras clave, categoría, rodeo/grupo, evento, fecha, período y estación con un nivel de confianza. Todas las sugerencias comienzan sin confirmar: el usuario puede editarlas, marcarlas individualmente o ignorarlas. Los datos explícitos del CSV tienen prioridad; por ejemplo, un `Draft Group` presente bloquea la aplicación de un rodeo inferido.

La importación conserva `filename_original`, `filename_keywords`, `filename_inferences`, `filename_inferences_confirmed` y `filename_inferences_modified_by_user`. Un evento originado exclusivamente por una sugerencia confirmada usa `source = filename_confirmed`, diferenciándolo de datos explícitos Gallagher.

## Jornadas ganaderas y alta individual

Los terneros no necesitan un alta individual al nacimiento. Antes del caravaneo pueden representarse mediante `herd_snapshots`, con rodeo, fecha, período y cantidad estimada. El seguimiento individual comienza cuando el animal se incorpora efectivamente a `animals`.

`animals.created_at` representa el ingreso del registro al sistema. `first_seen_at` es la primera aparición observada, `identified_at` solo se completa cuando el usuario confirma una jornada de caravaneo/identificación y `birth_date` continúa siendo independiente y opcional. `intake_source` identifica Gallagher, alta manual, compra u otra fuente.

Una `livestock_work_session` representa una jornada y puede tener muchas acciones (`livestock_work_session_actions`) y muchos participantes (`livestock_work_session_animals`). Los eventos individuales apuntan opcionalmente a la jornada mediante `work_session_id`, evitando repetir su contexto general. Una importación también puede quedar asociada a esa jornada.

Sanidad ya no se modela como un universo aislado para los nuevos registros: una vacunación, desparasitación o tratamiento es una acción dentro de la jornada. La acción admite producto, responsable, dosis general y unidad; `livestock_work_session_action_animals` permite reemplazarla por una dosis individual para animales concretos. Los registros históricos de `health_events` se conservan y siguen visibles.

La pantalla de nueva jornada consulta el catálogo activo de acciones, permite seleccionar el rodeo participante y carga sus animales. Para acciones que admiten dosis individual, el usuario puede habilitar excepciones por caravana; una excepción vacía continúa utilizando la dosis general.

Las importaciones pueden anularse sin borrar datos. La reversión está limitada a superadministradores, requiere consultar antes el impacto y protege animales que tengan eventos, otras importaciones, sanidad o participación en jornadas independientes. La estrategia definitiva es conservadora: animales creados exclusivamente por una importación revertida quedan inactivos con `status = revertido`; los eventos quedan anulados mediante campos `voided_*`. No se ejecutan `DELETE` físicos sobre esos animales o eventos, por lo que una jornada anulada conserva participantes y acciones para auditoría.

La procedencia de una asociación se conserva en `session_mode`, `created_from_import_id` y tres tablas puente específicas para participantes, acciones y animales por acción. Una reversión sólo anula la jornada cuando esa jornada fue creada por la misma importación. Si se utilizó una jornada preexistente, retira exclusivamente las relaciones cuya procedencia está demostrada y conserva cualquier relación previa o compartida por otra importación. Para importaciones históricas sin procedencia explícita se adopta la opción conservadora: no se presume propiedad y no se elimina la relación.

Cuando una acción o participante creado por una importación continúa siendo usado por otra, `created_from_import_id` se transfiere a una importación activa antes de retirar la procedencia revertida. Esto evita borrar acciones reutilizadas y también evita dejarlas huérfanas cuando posteriormente se revierta la última importación usuaria.

Los valores `Draft Group` no crean rodeos automáticamente. El preview exige una decisión por cada valor único: asociar un rodeo existente, ignorar o crear uno nuevo con confirmación explícita. Sólo las coincidencias exactas —ignorando mayúsculas y espacios— se preseleccionan; las aproximadas son sugerencias editables. Todas las decisiones quedan guardadas en `livestock_imports.draft_group_decisions` y en el log de auditoría.

Los catálogos poseen códigos estables y los registros nuevos completan `type_id` y `action_type_id`, manteniendo además los campos textuales por compatibilidad. La fecha indicada por el usuario se materializa como `eventDate` antes de entrar al importador heredado; no se utiliza `now()` como reemplazo de una fecha ganadera ni para `first_seen_at`.

En el historial Gallagher, **Anular** solicita un motivo y conserva toda la información. **Revertir** sólo se muestra a superadministradores y primero informa eventos a quitar, animales eliminables y animales protegidos.

## Migraciones pendientes después de 038 y 039

Aplicar, en este orden, `040_workflow_catalogs_mapping_and_reversal.sql` y `041_flexible_import_workflow.sql`. No se modifican ni se vuelven a ejecutar 038 y 039.

Confirmar un tipo de jornada sugerido por el nombre crea la jornada y vincula participantes/eventos. Las acciones detectadas explícitamente en columnas —por ejemplo lectura, pesaje y tratamiento— se agregan por separado. Una primera lectura nunca se interpreta como nacimiento, caravaneo, destete o parto sin confirmación.

## Información útil para próximos formatos

Conviene conseguir exportaciones Gallagher reales que incluyan peso/unidad, tratamiento/producto/dosis, condición corporal, reproducción, clasificación y movimientos; además de documentación sobre zona horaria, codificación, separador y reglas del EID. Cada nuevo formato puede agregarse al mapeo del proveedor sin modificar `animals`.

El CSV original no se guarda en Storage en esta versión. Se conserva hash, nombre y detalle completo de filas. Si se necesita custodia documental, debe agregarse un bucket privado con policies basadas en el establecimiento.
