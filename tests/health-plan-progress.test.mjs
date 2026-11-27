import test from "node:test"
import assert from "node:assert/strict"
import { healthPlanProgress } from "../src/features/farms/health-plan-progress.ts"

test("linked work marks its own plan item, month and year", () => {
  const row = { id: "j", itemId: "plan-a", date: "2026-04-30T00:00:00+00:00", filename: "jornada.csv" }
  const another = { ...row, id: "k", date: "2026-04-15", filename: "otra.csv" }
  const progress = healthPlanProgress([
    row, another,
    { ...row, id: "old", date: "2025-04-30" },
    { ...row, itemId: "plan-b", date: "2026-05-01" },
    { ...row, date: "2026-00-01" },
  ], 2026)
  assert.deepEqual(progress.get("plan-a:4"), [row, another])
  assert.equal(progress.get("plan-a:5"), undefined)
  assert.equal(progress.get("plan-b:4"), undefined)
  assert.equal(progress.size, 2)
})
