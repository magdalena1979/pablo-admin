# Reinicio para la prueba de Pablo

Este script no es una migración. Debe ejecutarse una sola vez y manualmente.

Antes de usarlo, generar un respaldo desde Supabase. Luego abrir el SQL Editor,
copiar el contenido de `reset_for_pablo_trial.sql` y ejecutarlo completo.

Conserva usuarios, clientes, campos, lotes, categorías, labores y el resultado
consolidado 2025/26. Elimina operaciones demo y deja 2026/27 activa y vacía para
que Pablo pueda cargar su propia prueba.

Si se ejecuta por error antes de `commit`, se puede reemplazar `commit` por
`rollback`. Después del commit, la recuperación requiere el respaldo.
