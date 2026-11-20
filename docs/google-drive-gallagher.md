# Revisión de Gallagher desde Drive

**En pausa:** la pantalla de Hacienda usa ahora **Importar CSV** desde la computadora. La conexión descrita aquí no se carga ni se solicita para ese flujo. Ver [prueba con CSV locales](prueba-csv-gallagher.md).

En Hacienda, **Actualizar** lee los CSV de la carpeta acordada y muestra coincidencias por EID con las caravanas registradas. No escribe en Supabase ni en Drive, no crea animales y no marca caravanas como utilizadas. La confirmación de vínculos no está implementada en esta entrega.

Carpeta: https://drive.google.com/drive/folders/1MwNFGhoj9VsOdVtLZPtX6DvoEILkWrv1

## Configuración única

1. En Google Cloud, seleccionar o crear el proyecto para esta aplicación y habilitar **Google Drive API**.
2. Configurar Google Auth Platform / la pantalla de consentimiento OAuth. Mientras la aplicación esté en modo de pruebas, agregar como usuarios de prueba las cuentas que la usarán.
3. Crear un cliente OAuth de tipo **Aplicación web** y autorizar el origen exacto de Vite, normalmente `http://localhost:5173`. Autorizar también el origen HTTPS de la aplicación cuando se despliegue. El flujo usa una ventana emergente; no requiere una URL de redirección propia.
4. Copiar el ID público del cliente, terminado en `.apps.googleusercontent.com`, a `.env.local`:

   ```dotenv
   VITE_GOOGLE_DRIVE_CLIENT_ID=ID_PUBLICO_DEL_CLIENTE
   ```

5. Reiniciar Vite con `npm run dev`. En producción, configurar la misma variable en Vercel y volver a desplegar.

No colocar el secreto del cliente OAuth, contraseñas, claves privadas ni claves service role en variables VITE.

## Uso

1. Entrar a Hacienda y pulsar **Actualizar**.
2. Autorizar el acceso de lectura con una cuenta que tenga acceso a la carpeta. La autorización de Google es independiente del inicio de sesión en la aplicación.
3. Esperar la descarga y revisión. Los CSV vacíos y los errores se identifican individualmente; no se ocultan.
4. Seleccionar un archivo. Si está presente, se selecciona inicialmente `2025-05-10 TOROS 2.csv`.
5. Revisar EID, caravana visual, fecha y hora, cliente, establecimiento, RENSPA, sexo del rango, estado actual y posibles conflictos.

La pertenencia se obtiene del stock registrado y de las relaciones existentes; nunca se deduce del nombre del archivo o de la carpeta. Las consultas a Supabase usan la sesión del usuario y mantienen RLS. Un EID sin alta previa entre los datos autorizados se muestra como pendiente, aunque exista un animal con ese EID.

Los permisos de Google solicitados son de lectura (`drive.readonly`). La aplicación consulta únicamente la carpeta configurada, pero ese permiso de Google no está limitado técnicamente a una sola carpeta. El token se conserva solo en memoria, no se guarda en el navegador, el repositorio ni Supabase. Al vencer requiere nueva autorización.

Se revisan los hijos directos de la carpeta, sin recorrer subcarpetas. Límites: 500 CSV, 2 MB por archivo y 20 MB descargados por revisión. Los errores parciales se muestran por archivo y las lecturas se identifican como lecturas, no como cantidad de animales únicos.

## Prueba acordada

Con las seis caravanas de San Ignacio registradas como machos, TOROS 2 debería mostrar seis coincidencias:

`032010006501857` a `032010006501862`.

Esto debe verificarse con los datos vivos y la cuenta de Google autorizada. Las pruebas automatizadas verifican el reconocimiento y los conflictos, pero no reemplazan esa comprobación.

Referencias: [OAuth en el navegador](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [listado de archivos de Drive](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list), [lectura de archivos](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get).
