# Sistema visual de la aplicación

## Estándar para listados

Caravanas, Sesiones de Gallagher, Clientes y Trabajos usan el mismo patrón. Aplicarlo a los nuevos listados y reutilizar los estilos globales al actualizar los existentes.

Omitir las descripciones introductorias debajo del título. Mantener los datos de contexto, las instrucciones necesarias para completar acciones y los mensajes de estado, validación o error.

- Contenedor `page compact-list-page` y encabezado `compact-list-heading` con `PageHeader`. El título de página usa 23 px. Cuando corresponde volver, usar `compact-back` con una flecha de 20 px y nombre accesible.
- Controles de 42 px con texto de 14 px. Usar `toolbar compact-list-filters` para selectores del mismo ancho y `toolbar compact-list-search` para un buscador de ancho completo. El contenedor `search` dibuja el borde y el foco del buscador. Los selectores de la barra dejan 12 px entre la flecha y el borde.
- Tabla con `panel data-panel`, `table-wrap` y `data-table`. El encabezado de columna usa 12 px y las celdas usan 13 px. Mantener las acciones de cada fila con `table-action` o `text-button` y mostrar los estados vacíos dentro de la tabla.
- Los tamaños se definen en `src/styles/tokens.css` y se aplican en `src/styles/design-system.css`. Conservar en CSS local solo la distribución propia de cada vista. En pantallas angostas los filtros se acomodan en filas y la tabla admite desplazamiento horizontal.
- Para desplegables de selección simple, usar `AppSelect` con opciones `<option>`. El menú se ancla al campo en celular y escritorio, y conserva la validación del formulario.

## Alcance y auditoría

Refactor exclusivamente de presentación. React 19, TypeScript, Vite, CSS/Tailwind, Lucide y Recharts existentes. Sin nuevas dependencias, migraciones, cambios de permisos ni contratos de servicios.

Rutas activas revisadas:

| Ruta | Vista / estados |
| --- | --- |
| `/login` | Autenticación y errores |
| `/inicio` | Acciones y establecimientos, carga, búsqueda, vacío y error |
| `/clientes` | Grilla completa, ficha, alta/edición, establecimiento y RENSPA |
| `/caravanas` | Recepciones, formulario, rangos y confirmación |
| `/establecimientos/:id` | Hacienda, últimos valores/mensual, trabajos, caravanas y datos |
| `/campos/:id` | Detalle anterior: resumen, lotes, hacienda, sanidad, administración y tareas |
| `/hacienda` | Sesiones Gallagher y revisión/importación con sus modales |
| `/sanidad` | Jornadas y formularios existentes |
| `/labores` | Órdenes y planificación multilote |
| `/configuracion` | Clientes, lotes, labores, objetivos, valuaciones y usuarios |

`/` redirige a Inicio, `/campos` redirige a Configuración. RENSPA e historiales son secciones internas, no rutas nuevas. Reportes no tiene una ruta independiente actualmente.

También inventariados: AdministrationPage, AgriculturePage, CampaignHistoryPage, DashboardPage, FarmsPage, IncomePage, InventoryPage, LivestockDecisionPage, LivestockPage, LivestockRegistryPage, ManagementPage, SuppliesPage y PlaceholderPage. Permanecen sin rutas nuevas. Sus tablas, formularios, tarjetas, gráficos y diálogos usan los contratos visuales compartidos, sin reactivar módulos.

Duplicación detectada: estilos de encabezados, tablas, botones, paneles, formularios y modales distribuidos en CSS global y 30+ hojas locales; estilos del layout superpuestos en sidebar.css y workspace-design.css. Se sustituye la antigua capa workspace-design por el sistema global. Las hojas locales conservan distribución y tamaños específicos, el sistema global es la fuente de identidad.

## Organización

- `src/styles/tokens.css`: paleta, contraste, tipografía, espaciado, radios, sombras y controles.
- `src/styles/design-system.css`: componentes base, adaptadores para las clases existentes y responsive.
- `src/components/ui/Presentation.tsx`: PageHeader, SectionHeading, Badge y Surface.
- CSS local: disposición específica de cada módulo, sin redefinir la identidad global.

Se importa el sistema al final de `main.tsx`. El ámbito `#root` hace explícita la prioridad de los tokens sobre los estilos locales heredados; no depende del orden accidental de las hojas de cada pantalla.

## Reglas

Navegación azul oscuro, interacción violeta. El color del cliente identifica contexto, no reemplaza el color semántico de las acciones. Verde solo para estados explícitamente positivos: un `Yes` desconocido de CSV permanece como texto original. No interpretar valores de negocio mediante color.

Texto base 14px, controles 14px, tablas 13px, auxiliares 12px. Títulos sin serif decorativa. Superficies claras, bordes suaves, sombras mínimas. Controles de 42px. Foco visible y estado deshabilitado consistente.

Preservar scroll horizontal, columnas, filtros, ordenamientos, historiales, validaciones y transacciones de importación. No agregar paginación que no existía ni métricas ficticias para copiar la referencia. El selector de campo conserva la navegación y el reinicio de RENSPA al cambiar de campo.

La referencia final solicitada ubica el perfil en el encabezado y deja visible el menú en escritorio. El menú tiene un control explícito para contraerlo a iconos con sus títulos accesibles; en móvil conserva el drawer existente. En el menú general quedan Inicio y Clientes; Caravanas y Gallagher conservan sus rutas y accesos desde las cards de Inicio. Las secciones del establecimiento conservan sus enlaces.

Hacienda presenta un resumen visual del conjunto mostrado: cantidad, estados activos explícitos, fecha máxima de los eventos ya cargados y nombre del campo. Son indicadores de presentación derivados de la misma lista, no nuevos datos persistidos ni cambios de cálculo productivo. La grilla conserva todas las columnas y fechas de origen, y los modos de últimos valores y mensual.

## Pantallas futuras

Usar PageHeader para título/acciones, Surface o `.panel` para tarjetas, SectionHeading para secciones y Badge para estados explícitos. Reutilizar `.data-table` dentro de `.table-wrap`, `.form-grid`, `.primary-button`, `.secondary-button`, `.dialog-card` y `.workspace-tabs`. Evitar colores hexadecimales y tamaños de fuente específicos de una página; usar tokens.

## Validación

Auditoría de 23 componentes Page y todas las rutas activas. Se revisaron también los contratos de clases de componentes de detalle, importación, formularios y módulos sin ruta. No se ejecutaron acciones de negocio, importaciones ni SQL para validar el diseño.

El proyecto no define scripts de lint. Las comprobaciones son TypeScript, build de Vite y las 42 pruebas unitarias disponibles para rangos, filtros, CSV, confirmaciones e historiales. La verificación visual en el navegador corresponde al usuario, por pedido expreso; no se usa Chrome ni se declara QA visual realizada.
