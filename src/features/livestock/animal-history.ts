export interface HistoryEntry {
  id:string; date:string; title:string; source:string; filename:string; notes:string;
  fields:Record<string,unknown>; sessionTitle?:string; csvDate?:string
}
const identity = new Set(["numero de etiqueta","tag number","id electronico","electronic id","eid","nlis","fecha","date","time","hora","notas","notes"])
export function recordedFields(raw:unknown):Record<string,string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  return Object.fromEntries(Object.entries(raw).filter(([key,value]) => {
    const name=key.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()
    return !identity.has(name) && value !== null && value !== undefined && typeof value !== "object" && String(value).trim() !== ""
  }).map(([key,value]) => [key,String(value)]))
}
export function latestRecorded(entries:HistoryEntry[]) {
  const latest=new Map<string,{field:string;value:string;date:string;filename:string}>()
  for (const entry of [...entries].sort((a,b)=>b.date.localeCompare(a.date))) {
    for (const [field,value] of Object.entries(recordedFields(entry.fields))) {
      if (!latest.has(field)) latest.set(field,{field,value,date:entry.date,filename:entry.filename})
    }
  }
  return [...latest.values()]
}
