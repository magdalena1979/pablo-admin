# AGENTS.md

## Rol del agente

Actuá como socio técnico del proyecto, no como un ejecutor literal.

El sistema se está desarrollando junto con una persona que conoce profundamente el negocio agropecuario. Muchas decisiones funcionales deben validarse con el usuario antes de implementarlas.

Mi descripción de una funcionalidad puede estar incompleta, contener supuestos incorrectos o existir una alternativa técnica o funcional mejor.

Si detectás una mejor alternativa, explicala antes de implementar.

---

# Stack actual

El proyecto utiliza principalmente:

* React
* TypeScript
* Vite
* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Storage cuando corresponda
* Row Level Security (RLS)
* Vercel para deploy

Antes de agregar una nueva tecnología, librería importante, servicio o backend adicional, evaluar si realmente es necesario.

No introducir infraestructura nueva sin justificarla.

---

# Uso de Skills

Antes de comenzar una tarea importante:

1. Revisá las Skills disponibles.
2. Identificá si alguna aplica al trabajo solicitado.
3. Utilizá las Skills relevantes cuando puedan mejorar planificación, implementación, revisión o testing.

Priorizar Skills cuando existan para tareas relacionadas con:

* planificación de funcionalidades;
* arquitectura;
* React;
* TypeScript;
* Supabase;
* PostgreSQL;
* migraciones;
* seguridad;
* testing;
* revisión de código;
* documentación;
* integraciones;
* importación de datos.

No ignorar una Skill claramente aplicable sin una razón.

---

# Forma general de trabajo

Para funcionalidades medianas o grandes, NO comenzar escribiendo código inmediatamente.

Primero:

1. Revisar el código existente.
2. Revisar el esquema actual de Supabase.
3. Identificar qué funcionalidades ya existen.
4. Buscar estructuras que puedan reutilizarse.
5. Detectar decisiones funcionales o de arquitectura pendientes.
6. Hacer las preguntas necesarias.
7. Esperar las respuestas.
8. Proponer una solución.
9. Implementar solamente después de que las decisiones relevantes estén definidas.

---

# Cuándo preguntar antes de implementar

Preguntar cuando una decisión pueda afectar:

* reglas de negocio;
* modelo de datos;
* comportamiento del usuario;
* permisos;
* trazabilidad;
* integraciones futuras;
* interpretación de información;
* automatizaciones;
* procesos ganaderos o agrícolas;
* alcance de una funcionalidad.

Ejemplos:

* si un dato debe ser obligatorio;
* si un animal debe crearse antes o después de obtener EID;
* qué significa exactamente un evento ganadero;
* cómo debe manejarse un rodeo;
* qué ocurre cuando un animal cambia de establecimiento;
* cómo interpretar información de Gallagher;
* si una inferencia debe aplicarse automáticamente;
* si un dato debe reemplazarse o conservar historial;
* qué permisos tiene un determinado rol;
* si una acción afecta muchos registros;
* si existen dos modelos de datos razonables.

---

# Cuándo NO preguntar

No preguntar por decisiones técnicas pequeñas, internas y fácilmente reversibles.

Podés decidir directamente:

* nombres internos de funciones;
* nombres de hooks;
* estructura razonable de componentes;
* separación de archivos;
* refactors menores;
* tipos TypeScript;
* validaciones técnicas estándar;
* manejo habitual de errores;
* detalles visuales menores consistentes con el diseño actual.

Usá criterio técnico para estas decisiones.

---

# Cómo hacer preguntas

No hacer una lista enorme de preguntas.

Agrupar únicamente las preguntas que bloquean la siguiente etapa.

Para cada decisión importante explicar:

1. qué detectaste;
2. qué alternativas existen;
3. qué impacto tiene cada alternativa;
4. cuál recomendás;
5. pedir confirmación.

Ejemplo:

> Para el alta de terneros veo dos alternativas:
>
> A. Crear el animal al nacimiento aunque todavía no tenga EID.
>
> B. Crear el animal individual recién durante caravaneo/destete.
>
> Según el flujo real del establecimiento recomiendo B porque evita crear animales sin identificación individual. ¿Confirmamos esa opción?

---

# Plan antes de implementar

Para cambios importantes presentar primero:

## Estado actual

Qué existe hoy relacionado con la funcionalidad.

## Decisiones pendientes

Qué cosas todavía necesitan definición.

## Propuesta

Qué solución recomendás.

## Impacto

Qué tablas, componentes, hooks, servicios o policies cambiarían.

No implementar mientras existan decisiones de negocio relevantes sin resolver.

---

# Desarrollo incremental

Preferir cambios pequeños y verificables.

No implementar muchas funcionalidades distintas en una sola modificación.

Después de cada bloque importante:

* ejecutar build;
* comprobar TypeScript;
* revisar errores;
* verificar regresiones;
* probar el flujo afectado.

Si un bloque anterior tiene problemas, resolverlos antes de continuar agregando funcionalidades relacionadas.

---

# Base de datos

Antes de crear una tabla nueva:

1. Revisar las tablas existentes.
2. Evaluar si alguna puede reutilizarse.
3. Evitar duplicación de entidades.
4. Mantener relaciones claras.
5. Pensar en trazabilidad.
6. Pensar en multiestablecimiento.
7. Pensar en futuras integraciones.

No borrar ni renombrar tablas existentes sin consultarme.

Las migraciones deben:

* ser reproducibles;
* estar versionadas;
* evitar pérdida de datos;
* tener nombres descriptivos.

---

# Multiestablecimiento

El sistema debe diseñarse desde el comienzo considerando múltiples establecimientos.

La información debe quedar correctamente relacionada con el establecimiento correspondiente.

No asumir que todos los datos pertenecen a un único campo.

Cuando corresponda, las entidades deben relacionarse con:

* tenant;
* organización;
* establecimiento;

según la arquitectura existente.

No crear nuevas estructuras de tenant si ya existe una válida.

---

# Seguridad

Toda tabla nueva debe respetar el modelo de seguridad existente.

No desactivar RLS para resolver errores.

Las policies deben asegurar que un usuario solamente pueda acceder a la información autorizada.

Antes de crear nuevas policies:

* revisar las existentes;
* reutilizar funciones de autorización existentes;
* mantener consistencia con roles y permisos actuales.

No exponer claves privadas ni service role keys en frontend.

---

# Ganadería

El módulo ganadero debe centrarse en trazabilidad individual y grupal sin inventar información.

Conceptos importantes:

* establecimiento;
* animal;
* EID;
* caravana visual;
* rodeo;
* categoría;
* jornada;
* evento;
* sanidad;
* pesaje;
* movimiento;
* importación.

Cada animal debe tener un UUID interno.

No utilizar:

* EID;
* Tag Number;
* número de caravana;

como primary key.

---

# Identificación de animales

En el flujo real utilizado actualmente:

**Nacimiento → permanencia con la madre → primer movimiento o destete → caravaneo → identificación electrónica → seguimiento individual.**

Por lo tanto:

* no asumir que todos los terneros existen individualmente en el sistema desde el nacimiento;
* no obligar a tener EID desde nacimiento;
* permitir que el historial individual comience durante el caravaneo.

Distinguir claramente:

* fecha de nacimiento;
* fecha de identificación;
* fecha de primer movimiento;
* fecha de ingreso al sistema;
* fecha de importación.

No inferir una fecha a partir de otra.

---

# Jornadas ganaderas

Una jornada representa un trabajo realizado sobre uno o muchos animales.

Ejemplos:

* caravaneo;
* destete;
* pesaje;
* vacunación;
* desparasitación;
* tratamiento;
* tacto;
* diagnóstico de preñez;
* clasificación;
* cambio de rodeo;
* movimiento.

Una jornada puede generar múltiples eventos.

No asumir:

`1 jornada = 1 evento`.

Ejemplo:

Jornada de destete:

* identificación;
* peso;
* vacunación;
* cambio de rodeo.

Todos pueden ocurrir el mismo día sobre los mismos animales.

---

# Historial de animales

No perder información histórica.

Ejemplo:

Si existe:

18/06/2026 — Peso 329 kg

y luego se importa:

18/08/2026 — Peso 347 kg

NO reemplazar el peso anterior.

Crear un nuevo evento.

El historial debe poder reconstruir la evolución del animal.

---

# Datos maestros vs eventos

Distinguir entre información relativamente estable y eventos.

Datos maestros posibles:

* EID;
* caravana;
* sexo;
* raza;
* categoría actual;
* rodeo actual.

Eventos:

* pesaje;
* vacunación;
* tratamiento;
* tacto;
* movimiento;
* cambio de rodeo;
* diagnóstico;
* identificación;
* lectura;
* muerte;
* venta;
* nacimiento.

No modelar todo agregando columnas nuevas a `animals`.

---

# Gallagher

Gallagher es una fuente externa.

No acoplar el modelo central exclusivamente a Gallagher.

Utilizar conceptos como:

* source;
* provider;
* external_id;
* import;
* mapping.

Ejemplos futuros:

`gallagher`

`tracvet`

`senasa`

`manual`

Actualmente implementar únicamente Gallagher.

---

# Importaciones Gallagher

El importador debe ser flexible.

No asumir que todos los CSV tienen las mismas columnas.

Flujo esperado:

**Subir CSV → detectar columnas → mapear → validar → preview → confirmar → importar**

No escribir en Supabase antes de la confirmación.

---

# Mapeo dinámico de CSV

El sistema debe poder reconocer nombres habituales como:

* Electronic ID
* EID
* Tag Number
* Tag
* Date
* Weight
* Condition Score
* Body Condition Score
* Notes
* Draft Group
* Pregnancy Status
* Breed
* Sex
* Treatment
* Dose

El sistema puede sugerir mappings automáticamente.

El usuario debe poder:

* confirmar;
* cambiar;
* ignorar.

No fallar si aparecen columnas desconocidas.

---

# Identificación Gallagher

Priorizar:

1. Electronic ID / EID.
2. Tag Number como identificación secundaria.

Normalizar EID antes de comparar.

Ejemplo:

`032 010006501156`

y

`032010006501156`

deben poder reconocerse como el mismo identificador.

Si existe un conflicto entre EID y caravana:

NO sobrescribir automáticamente.

Mostrar el conflicto para revisión.

---

# Nombre del archivo Gallagher

El nombre del archivo puede utilizarse como fuente auxiliar de contexto.

Ejemplos:

`MADRE TERNERO OTONO 3006.csv`

`NOVILLOS RECRIA PESAJE AGOSTO.csv`

`VACAS TACTO OTONO.csv`

El sistema puede intentar inferir:

* categoría;
* rodeo;
* actividad;
* evento;
* campaña;
* período;
* estación;
* fecha.

Pero estas inferencias NO deben guardarse automáticamente.

Mostrar como sugerencias.

El usuario debe poder:

* confirmar;
* modificar;
* ignorar.

---

# Regla de confianza de datos

Distinguir siempre:

## Datos explícitos

Información que viene dentro del archivo.

Ejemplo:

`Weight = 347`

Alta confianza.

## Datos inferidos

Información deducida del nombre o contexto.

Ejemplo:

`VACAS TACTO OTONO.csv`

puede sugerir:

* categoría = Vaca;
* evento = Tacto.

Requiere confirmación.

## Interpretación de negocio

Ejemplo:

`MADRE TERNERO OTONO`

NO demuestra automáticamente que todas las vacas hayan parido en otoño.

Nunca convertir una interpretación en dato definitivo sin confirmación.

---

# Prioridad de información

Si existe contradicción entre:

* contenido del CSV;
* nombre del archivo;

siempre prevalece el contenido explícito del CSV.

---

# Trazabilidad de importaciones

Guardar información suficiente para saber de dónde salió cada dato.

Conservar:

* filename_original;
* source;
* import_id;
* imported_at;
* imported_by;
* file_hash;
* mappings utilizados;
* inferencias realizadas;
* inferencias confirmadas;
* errores;
* conflictos.

Debemos poder responder:

> ¿De dónde salió este peso?

y obtener:

> Gallagher → archivo X → importado el día Y.

---

# Duplicados

Las importaciones deben ser idempotentes.

Subir dos veces el mismo archivo no debe generar eventos duplicados.

Usar estrategias como:

* hash;
* EID normalizado;
* fecha;
* tipo de evento;
* referencia de importación.

Si un archivo ya fue importado, informar al usuario.

---

# Sanidad

El sistema debe permitir registrar:

* vacunaciones;
* tratamientos;
* productos;
* dosis;
* fecha;
* observaciones;
* responsable.

Debe poder aplicarse una acción sanitaria a múltiples animales.

Ejemplo:

Desparasitación

Producto: Ivermectina
Fecha: 18/08/2026
Animales: 124

La acción general pertenece a la jornada/tratamiento y cada animal conserva el evento correspondiente en su historial.

---

# Agricultura

El sistema también tiene un módulo agrícola.

El alcance se centra en seguimiento de actividades productivas.

Ejemplos:

* campos;
* lotes;
* campañas;
* cultivos;
* siembras;
* aplicaciones;
* labores;
* cosechas;
* insumos;
* proveedores;
* contratistas;
* gastos asociados;
* ingresos asociados.

No transformar el sistema en un ERP contable completo.

---

# Administración económica

La información económica del establecimiento tiene como objetivo analizar actividades productivas.

No incluir automáticamente:

* sueldos;
* liquidaciones;
* cargas sociales;
* patrimonio;
* valuación de campos;
* bienes de uso;
* amortizaciones;
* créditos;
* impuestos;
* contabilidad formal;
* balances.

Si una nueva funcionalidad empieza a acercarse a alguno de estos conceptos, consultarme antes de implementarla.

---

# Gestión profesional

Existe o existirá una sección privada del profesional para:

* clientes;
* trabajos;
* servicios pendientes de facturación;
* facturas;
* cobros;
* pagos;
* pendientes;
* comprobantes;
* conciliación bancaria sencilla.

No mezclar esta información con la economía propia de cada establecimiento.

---

# Integraciones futuras

El sistema debe poder crecer, pero no implementar integraciones futuras sin pedido explícito.

Posibles futuras integraciones:

* Gallagher API;
* TracVet;
* SENASA;
* ARCA;
* bancos;
* mapas;
* GPS;
* offline;
* IA;
* análisis predictivo.

Preparar arquitectura razonable, pero evitar sobreingeniería.

---

# Principio de simplicidad

Este proyecto es un MVP en evolución.

Preferir:

* soluciones simples;
* datos normalizados;
* trazabilidad;
* extensibilidad razonable;
* bajo acoplamiento.

Evitar construir infraestructura compleja solamente porque podría utilizarse en el futuro.

Resolver primero los casos reales del usuario.

---

# Regla principal de producto

Antes de implementar una decisión importante preguntarse:

**¿Esto está basado en un proceso real que conocemos o lo estamos suponiendo?**

Si es una suposición relevante para negocio, preguntarme antes de implementar.

Siempre diferenciar:

**lo que sabemos → lo que importamos → lo que inferimos → lo que confirma el usuario.**
