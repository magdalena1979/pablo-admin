import test from "node:test"
import assert from "node:assert/strict"
import { summarizeWeighings } from "../src/features/farms/livestock-weighings.ts"

test("compares the same animals on the two latest days and reports sample coverage", () => {
  const summary = summarizeWeighings(new Set(["a", "b", "c"]), [
    { animalId: "a", date: "2026-06-11", kg: 210 },
    { animalId: "a", date: "2026-06-11", kg: 205 },
    { animalId: "b", date: "2026-06-11", kg: 250 },
    { animalId: "a", date: "2026-06-01", kg: 200 },
    { animalId: "c", date: "2026-06-01", kg: 180 },
    { animalId: "b", date: "2026-05-01", kg: 160 },
    { animalId: "another-herd", date: "2026-07-01", kg: 300 },
  ])
  assert.deepEqual(summary, {
    date: "2026-06-11", previousDate: "2026-06-01", average: 230, weighed: 2, paired: 1, gain: 1,
  })
})

test("does not infer daily gain when there is no comparable previous weight", () => {
  const summary = summarizeWeighings(new Set(["a", "b"]), [
    { animalId: "a", date: "2026-06-11", kg: 210 },
    { animalId: "b", date: "2026-06-01", kg: 180 },
  ])
  assert.equal(summary?.gain, null)
  assert.equal(summary?.paired, 0)
  assert.equal(summarizeWeighings(new Set(), []), null)
})
