# Datos iniciales

Los datos de demostración se encuentran en `supabase/seed.sql`. Incluyen cuatro clientes ficticios, cuatro campos del centro bonaerense, campañas junio-junio, lotes, tropas, animales identificados y movimientos ganaderos.

Los nombres, CUIT, correos y teléfonos son ficticios. No deben confundirse con información comercial real.

El primer usuario se crea en Supabase Auth y luego se registra en `profiles` con el rol `super_admin`.

Para cargar el conjunto de demostración en el proyecto vinculado:

```bash
npx supabase db push --include-seed
```
