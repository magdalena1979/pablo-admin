# Pablo Mendivil — Gestión Agropecuaria

MVP para administrar campos, lotes, hacienda, sanidad y resultados económicos de establecimientos agropecuarios.

## Desarrollo local

1. Copiar `.env.example` como `.env.local`.
2. Completar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Ejecutar `npm install` y `npm run dev`.

## Base de datos

Crear un proyecto Supabase independiente y ejecutar en orden las migraciones de `supabase/migrations`.
Todas las tablas expuestas tienen RLS. Los usuarios no superadministradores acceden únicamente a establecimientos asignados.

Para un entorno de prueba, `supabase/seed.sql` aporta datos agropecuarios ficticios y realistas. Se carga con `npx supabase db push --include-seed` después de crear el primer perfil `super_admin`.

## Producción

El build se genera con `npm run build`. `vercel.json` incluye la reescritura necesaria para las rutas SPA.

En Vercel se deben configurar las mismas dos variables públicas. La clave `service_role` nunca debe exponerse en el navegador.
