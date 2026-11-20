export type TagSex = "macho" | "hembra"
export interface TagRangeInput { first: string; last: string; sex: TagSex | "" }
export interface TagAllocation { quantity: string; sex: TagSex | "" }
export interface CheckedTagRange { first: string; last: string; sex: TagSex; quantity: number }
export const MAX_BAG_QUANTITY = 10000

export function normalizeTagEid(value: string): string {
  return value.replace(/\s/g, "")
}
export function lastEidFromQuantity(first: string, quantity: string): string {
  const from = normalizeTagEid(first)
  if (!/^\d{15}$/.test(from) || !/^\d+$/.test(quantity)) return ""
  const count = BigInt(quantity)
  if (count < 1n || count > BigInt(MAX_BAG_QUANTITY)) return ""
  const last = (BigInt(from) + count - 1n).toString().padStart(15, "0")
  return last.length === 15 ? last : ""
}
export function rangesFromQuantities(first: string, allocations: TagAllocation[]): TagRangeInput[] {
  let next = normalizeTagEid(first)
  return allocations.map(allocation => {
    const last = lastEidFromQuantity(next, allocation.quantity)
    const range = { first: last ? next : "", last, sex: allocation.sex }
    next = last ? lastEidFromQuantity(last, "2") : ""
    return range
  })
}
export function rangeQuantity(first: string, last: string): number | null {
  const from = normalizeTagEid(first), to = normalizeTagEid(last)
  if (!/^\d{15}$/.test(from) || !/^\d{15}$/.test(to) || BigInt(to) < BigInt(from)) return null
  return Number(BigInt(to) - BigInt(from) + 1n)
}
export function validateTagBag(first: string, last: string, declaredQuantity: string, ranges: TagRangeInput[]) {
  const from = normalizeTagEid(first), to = normalizeTagEid(last)
  const quantity = rangeQuantity(from, to)
  if (quantity === null) throw new Error("Ingresá el EID inicial y final de 15 dígitos, en orden ascendente.")
  if (quantity > MAX_BAG_QUANTITY) throw new Error(`Podés registrar hasta ${MAX_BAG_QUANTITY} caravanas por recepción.`)
  if (!/^\d+$/.test(declaredQuantity) || Number(declaredQuantity) !== quantity) throw new Error("La cantidad indicada en la bolsa no coincide con el rango desde / hasta.")
  if (!ranges.length) throw new Error("Agregá al menos un rango de destino.")
  const checked: CheckedTagRange[] = ranges.map((range, index) => {
    const start = normalizeTagEid(range.first), end = normalizeTagEid(range.last)
    const count = rangeQuantity(start, end)
    if (count === null) throw new Error(`Revisá los números del rango ${index + 1}.`)
    if (range.sex !== "macho" && range.sex !== "hembra") throw new Error(`Seleccioná machos o hembras para el rango ${index + 1}.`)
    if (start < from || end > to) throw new Error(`El rango ${index + 1} queda fuera de la bolsa.`)
    return { first: start, last: end, sex: range.sex, quantity: count }
  }).sort((a, b) => a.first.localeCompare(b.first))
  let expected = BigInt(from)
  for (const range of checked) {
    if (BigInt(range.first) < expected) throw new Error("Hay rangos de destino superpuestos.")
    if (BigInt(range.first) > expected) throw new Error("Quedan caravanas sin destino entre los rangos.")
    expected = BigInt(range.last) + 1n
  }
  if (expected !== BigInt(to) + 1n) throw new Error("Asigná un destino a todas las caravanas de la bolsa.")
  return { first: from, last: to, quantity, ranges: checked }
}
