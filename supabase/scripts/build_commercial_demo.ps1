param(
  [string]$OutputPath = (Join-Path $PSScriptRoot "commercial_demo.sql")
)

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$sources = @(
  "supabase/seed.sql",
  "supabase/migrations/005_demo_health_data.sql",
  "supabase/migrations/007_demo_expenses.sql",
  "supabase/migrations/009_demo_performance.sql",
  "supabase/migrations/011_demo_valuations.sql",
  "supabase/migrations/013_demo_income_sales.sql",
  "supabase/migrations/015_demo_operations_and_allocations.sql",
  "supabase/migrations/017_demo_agricultural_yields.sql",
  "supabase/migrations/019_demo_livestock_cycles.sql",
  "supabase/migrations/021_demo_multi_lot_work_orders.sql",
  "supabase/migrations/023_demo_work_catalog.sql",
  "supabase/migrations/025_demo_august_position.sql",
  "supabase/migrations/027_demo_management_control.sql",
  "supabase/migrations/029_demo_inventory_ledger.sql",
  "supabase/migrations/031_demo_order_supplies.sql",
  "supabase/migrations/033_demo_campaign_2025_26.sql",
  "supabase/migrations/035_demo_livestock_destination_decisions.sql"
)

$header = @"
-- PABLO MENDIVIL - DEMOSTRACION COMERCIAL
-- Generado automaticamente. Reejecutable e idempotente.
-- Requiere que todas las migraciones esten aplicadas y un super_admin activo.

begin;

do `$`$
begin
  if to_regclass('public.livestock_decisions') is null
     or to_regclass('public.work_order_inputs') is null then
    raise exception 'Primero ejecute: npx supabase db push';
  end if;
  if not exists(select 1 from public.profiles where role='super_admin' and active) then
    raise exception 'La demo necesita un super administrador activo';
  end if;
end`$`$;
"@

$parts = [System.Collections.Generic.List[string]]::new()
$parts.Add($header)
foreach ($relativePath in $sources) {
  $fullPath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $fullPath)) { throw "No se encontró $relativePath" }
  $sql = [System.IO.File]::ReadAllText($fullPath,[System.Text.Encoding]::UTF8)
  $sql = $sql -replace '(?im)^\s*(begin|commit);\s*$', ''
  $parts.Add("`n-- ===== FUENTE: $relativePath =====`n")
  $parts.Add($sql.Trim())
}
$parts.Add("`ncommit;`n")
$parts.Add(@"
select 'Campos' as concepto,count(*)::text as cantidad from public.farms where active
union all select 'Campanias',count(*)::text from public.campaigns
union all select 'Tropas',count(*)::text from public.herds where active
union all select 'Cultivos actuales',count(*)::text from public.crop_stands
union all select 'Ordenes',count(*)::text from public.field_operations
union all select 'Gastos',count(*)::text from public.expenses
union all select 'Ventas',count(*)::text from public.income_sales
union all select 'Items de stock',count(*)::text from public.inventory_items;
"@)

$outputDirectory = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $outputDirectory)) { New-Item -ItemType Directory -Path $outputDirectory | Out-Null }
[System.IO.File]::WriteAllText($OutputPath,($parts -join "`r`n"),[System.Text.UTF8Encoding]::new($false))
Write-Host "Demo comercial generada en: $OutputPath"
