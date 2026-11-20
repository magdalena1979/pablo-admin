# Probar CSV locales en Hacienda

La conexión a Google Drive quedó en pausa. Esta pantalla no requiere configurar Google, OAuth ni migraciones adicionales.

1. Entrar a **Hacienda** y pulsar **Importar CSV**.
2. Seleccionar uno o varios CSV desde la computadora. Los archivos se leen en el navegador; no se envían a Google ni se suben a Storage.
3. Esperar la revisión contra las caravanas y animales autorizados en Supabase.
4. Si se seleccionaron varios archivos, elegir el que se quiere ver en el selector.
5. Comprobar cliente, establecimiento y RENSPA reconocidos por EID, sexo del rango y posibles conflictos.
6. Revisar el listado de estados. Los archivos ya vinculados se reconocen por su hash en la base, incluso si se vuelven a seleccionar después de recargar la aplicación.
7. Pulsar **Confirmar N archivos sin conflictos** para procesar juntos los pendientes habilitados, o seleccionar un archivo y usar **Confirmar vinculación** para guardar únicamente ese archivo.
8. Los archivos vacíos, inválidos o con conflictos no se incluyen en la confirmación conjunta. Se informa el motivo por archivo. Se puede usar **Revisar nuevamente** después de corregir los datos del sistema sin volver a seleccionar los CSV.
9. Comprobar el resultado en **Hacienda** y los contadores disponibles/utilizadas en **Caravanas**.

## Primera prueba

Seleccionar `2025-05-10 TOROS 2.csv`, descargado previamente de Drive. Sus seis EID van de `032010006501857` a `032010006501862`.

Si las seis caravanas están registradas como machos en San Ignacio, deben aparecer seis coincidencias con ese establecimiento y su RENSPA. La pertenencia se resuelve con los registros del sistema; nunca con el nombre del archivo.

## Alcance actual

La selección y revisión son de solo lectura. **Confirmar vinculación** requiere la migración `047_confirm_gallagher_csv_tag_links.sql` y un usuario superadministrador. La migración se ejecuta una vez después de la 046; no se deben repetir las migraciones anteriores.

La confirmación revalida en PostgreSQL todos los EID, su pertenencia y los posibles conflictos. Si falla una fila, se revierte la operación completa del archivo. Cada combinación de RENSPA y fecha explícita genera una sesión confirmada. Un archivo puede abarcar varios clientes y establecimientos y se separa por las relaciones registradas, nunca por inferencias del nombre.

La confirmación conjunta procesa los archivos secuencialmente con una transacción por archivo. Un conflicto de negocio no descarta los demás archivos independientes: el que falló se identifica sin guardado parcial. Un problema de conexión, permisos o función faltante detiene nuevos pedidos; los ya confirmados se conservan. **Detener después de este archivo** deja terminar la operación en curso y conserva los archivos restantes pendientes.

Se reutilizan los animales existentes del mismo establecimiento y EID. No se sobrescriben caravana visual ni sexo existentes en contradicción con el rango o el CSV. Se completa el sexo si estaba vacío. La primera utilización registra usuario, momento de vinculación y animal; nuevas lecturas conservan ese primer uso y agregan otra sesión. No se infiere fecha de nacimiento ni fecha de identificación.

Se conserva archivo original, hash, columnas y datos de todas las filas. Las columnas veterinarias personalizadas quedan conservadas como datos originales; no se transforman automáticamente en diagnósticos o tratamientos. Las lecturas se fechan con la fecha/hora explícitas del CSV, interpretadas en horario de Argentina. Cuando solo existe fecha se conserva esa precisión en los datos originales y se usa medianoche para representar ese día.

El hash hace que repetir un archivo ya confirmado no duplique animales, eventos, sesiones ni vínculos. La anulación/reversión genérica de importaciones vinculadas se bloquea: necesita un flujo específico que respete la trazabilidad de las caravanas utilizadas.

Los conflictos y las caravanas sin alta previa quedan visibles y no se corrigen automáticamente. Los CSV vacíos o inválidos se muestran individualmente. La fecha y hora originales se conservan separadas en la revisión.

Se permiten hasta 500 CSV, 2 MB por archivo y 20 MB por selección.
