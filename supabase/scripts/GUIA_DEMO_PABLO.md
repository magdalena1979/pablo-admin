# Guion de demostración para Pablo

## Preparación

1. Ejecutar `npx supabase db push`.
2. Ejecutar `powershell -ExecutionPolicy Bypass -File supabase/scripts/build_commercial_demo.ps1`.
3. Abrir `supabase/scripts/commercial_demo.sql` en Supabase SQL Editor y ejecutarlo.
4. Abrir la aplicación en Vista consolidada y después seleccionar La Esperanza.

## Recorrido sugerido (15 minutos)

1. **Panel general:** posición física, cultivos, stock, hacienda y compromisos.
2. **Selector de campo:** demostrar separación por cliente y color.
3. **Labores y costos:** abrir una orden multilote y su presupuesto.
4. **Compras e insumos:** mostrar reserva de urea y faltante de compra.
5. **Hacienda:** revisar kg/ha, ganancia diaria y margen por tropa.
6. **Decisión al destete:** comparar vender, recriar y terminar.
7. **Administración e ingresos:** explicar cómo gastos y ventas llegan al margen.
8. **Campañas:** comparar 2025/26 con 2026/27 y cerrar con decisiones futuras.

## Mensaje central

La plataforma no busca solamente registrar datos: conecta producción, existencias
y administración para que Pablo pueda decidir por campo, lote, cultivo y tropa.

## No mostrar en la primera reunión

- Tareas y alertas.
- Detalles técnicos de Supabase o SQL.
- Configuración de permisos por campo.
