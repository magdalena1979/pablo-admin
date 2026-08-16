import { useFarmScope } from "@/app/providers/FarmScopeProvider"

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  const { selectedFarm } = useFarmScope()
  return <section className="page"><div className="page-heading"><div><span className="eyebrow">{selectedFarm?selectedFarm.name.toUpperCase():"VISTA CONSOLIDADA"}</span><h1>{title}</h1><p>{selectedFarm?`${description} Información exclusiva de ${selectedFarm.name}.`:description}</p></div></div>{!selectedFarm&&<article className="scope-notice"><strong>Seleccioná un campo para trabajar</strong><span>Usá el desplegable superior para abrir la administración de un establecimiento específico.</span></article>}<article className="panel module-soon"><span>Próxima etapa de implementación</span><h2>La base del módulo ya está contemplada</h2><p>Se habilitará manteniendo cada establecimiento claramente separado.</p></article></section>
}
