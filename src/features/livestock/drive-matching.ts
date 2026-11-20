export interface CsvReading { row: number; eid: string; tag: string; date: string; time: string; sex: string; error: string }
export interface RegisteredTag { eid: string; status: string; sex: string; client: string; clientId?: string; farm: string; farmId: string; renspa: string; renspaId: string }
export interface KnownAnimal { electronicId: string; farmId: string; tag: string; sex: string | null; active?: boolean; status?: string }
export interface MatchedReading extends CsvReading { registration?: RegisteredTag; result: "coincidencia" | "conflicto" | "sin_alta" | "error"; detail: string }
const normalizeHeader = (value: string) => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ")
export const normalizeReadingEid = (value: string) => value.replace(/\s/g, "")
const aliases = {
  eid: ["eid", "electronic id", "id electronico", "rfid"],
  tag: ["numero de etiqueta", "tag number", "vid", "caravana", "visual id"],
  date: ["fecha", "date", "event date"], time: ["time", "hora"], sex: ["sex", "sexo", "gender"],
}
export function csvReadings(headers: string[], rows: Record<string, string>[]): CsvReading[] {
  const find = (key: keyof typeof aliases) => headers.filter(header => aliases[key].includes(normalizeHeader(header)))
  const columns = Object.fromEntries(Object.keys(aliases).map(key => [key, find(key as keyof typeof aliases)])) as Record<keyof typeof aliases, string[]>
  if (columns.eid.length !== 1) throw new Error("El CSV debe tener una única columna EID / ID electrónico reconocible.")
  if (Object.values(columns).some(values => values.length > 1)) throw new Error("Hay varias columnas posibles para el mismo dato. Requiere revisar el mapeo.")
  const get = (row: Record<string, string>, key: keyof typeof aliases) => (row[columns[key][0]] ?? "").trim()
  return rows.map((raw, index) => {
    const eid = normalizeReadingEid(get(raw, "eid")), sex = get(raw, "sex").toLowerCase()
    return { row: index + 2, eid, tag: get(raw, "tag"), date: get(raw, "date"), time: get(raw, "time"),
      sex: ({ male: "macho", female: "hembra", m: "macho", f: "hembra", macho: "macho", hembra: "hembra" } as Record<string, string>)[sex] ?? sex,
      error: /^\d{15}$/.test(eid) ? "" : "EID ausente o inválido: se esperan 15 dígitos.",
    }
  })
}
export function matchReadings(rows: CsvReading[], tags: RegisteredTag[], animals: KnownAnimal[]): MatchedReading[] {
  const byEid = new Map(tags.map(tag => [tag.eid, tag]))
  const animalEids = new Map<string, KnownAnimal[]>()
  const animalTags = new Map<string, KnownAnimal[]>()
  for (const animal of animals) {
    animalEids.set(animal.electronicId, [...(animalEids.get(animal.electronicId) ?? []), animal])
    const key = `${animal.farmId}:${animal.tag}`
    animalTags.set(key, [...(animalTags.get(key) ?? []), animal])
  }
  const seen = new Set<string>()
  return rows.map(row => {
    const registration = byEid.get(row.eid)
    const result = (status: MatchedReading["result"], detail: string): MatchedReading => ({ ...row, registration, result: status, detail })
    if (row.error) return result("error", row.error)
    const readingKey = `${row.eid}|${row.date}|${row.time}`
    if (seen.has(readingKey)) return result("conflicto", "Lectura repetida dentro del mismo archivo.")
    seen.add(readingKey)
    if (!registration) return result("sin_alta", "Caravana sin alta previa entre los registros que tenés autorizados.")
    if (!registration.client || !registration.farm || !registration.renspa) return result("conflicto", "No se pudo resolver la pertenencia de la caravana.")
    if (!row.tag) return result("conflicto", "Falta la caravana visual en el CSV. Requiere revisión.")
    if (row.sex && row.sex !== registration.sex) return result("conflicto", "El sexo del CSV no coincide con el destino del rango.")
    const known = animalEids.get(row.eid) ?? []
    if (known.some(animal => animal.active === false || animal.status === "revertido")) return result("conflicto", "El animal está inactivo o revertido y requiere revisión.")
    if (known.some(animal => animal.farmId !== registration.farmId)) return result("conflicto", "El EID aparece en un animal de otro establecimiento autorizado.")
    if (known.some(animal => animal.tag !== row.tag)) return result("conflicto", "La caravana visual del animal no coincide con el CSV.")
    if (known.some(animal => animal.sex && animal.sex !== registration.sex)) return result("conflicto", "El sexo del animal no coincide con el rango.")
    if ((animalTags.get(`${registration.farmId}:${row.tag}`) ?? []).some(animal => animal.electronicId !== row.eid)) return result("conflicto", "La caravana visual ya pertenece a otro EID.")
    if (!["disponible", "utilizada"].includes(registration.status)) return result("conflicto", "El estado de la caravana requiere revisión.")
    if (registration.status === "utilizada" && !known.length) return result("conflicto", "La caravana figura utilizada, pero no se encontró su animal.")
    return result("coincidencia", known.length ? "Animal encontrado; se revisará la nueva sesión." : "Caravana disponible encontrada por EID.")
  })
}
