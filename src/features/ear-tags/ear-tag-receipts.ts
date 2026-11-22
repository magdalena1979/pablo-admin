import type { TagReceipt } from "@/services/ear-tags.service"

export function summarizeTagReceipts(receipts: TagReceipt[]) {
  const summaries = new Map<string, {
    id: string; renspaId: string; receivedOn: string; first: string; last: string
    total: number; male: number; female: number
  }>()
  for (const receipt of receipts) {
    const id = receipt.gallagherGroupId
      ? `gallagher:${receipt.renspaId}:${receipt.gallagherGroupId}`
      : `receipt:${receipt.id}`
    let summary = summaries.get(id)
    if (!summary) {
      summary = {
        id, renspaId: receipt.renspaId, receivedOn: receipt.receivedOn,
        first: receipt.first, last: receipt.last, total: 0, male: 0, female: 0,
      }
      summaries.set(id, summary)
    }
    if (receipt.first < summary.first) summary.first = receipt.first
    if (receipt.last > summary.last) summary.last = receipt.last
    summary.total += receipt.quantity
    for (const range of receipt.ranges) {
      if (range.sex === "macho") summary.male += range.quantity
      if (range.sex === "hembra") summary.female += range.quantity
    }
  }
  return [...summaries.values()].map(summary => ({
    ...summary, hasGaps: BigInt(summary.last) - BigInt(summary.first) + 1n > BigInt(summary.total),
  }))
}
