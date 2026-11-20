import type { ReactNode } from "react"

/** Presentation-only primitives. Data and actions stay in their owning pages. */
export function PageHeader({title,description,eyebrow,icon,actions}:{title:ReactNode;description?:ReactNode;eyebrow?:ReactNode;icon?:ReactNode;actions?:ReactNode}){
 return <header className="page-heading ui-page-heading"><div className="ui-page-title-group">{icon&&<span className="ui-page-icon" aria-hidden="true">{icon}</span>}<div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description&&<p>{description}</p>}</div></div>{actions&&<div className="ui-page-actions">{actions}</div>}</header>
}
export function SectionHeading({title,description,aside}:{title:ReactNode;description?:ReactNode;aside?:ReactNode}){
 return <div className="table-section-heading ui-section-heading"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div>{aside&&<span className="ui-section-count">{aside}</span>}</div>
}
export function Badge({children,tone="neutral"}:{children:ReactNode;tone?:"neutral"|"success"|"warning"|"danger"|"info"}){
 return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>
}
export function Surface({children,className=""}:{children:ReactNode;className?:string}){
 return <section className={`panel ui-surface ${className}`}>{children}</section>
}
