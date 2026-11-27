import test from "node:test"
import assert from "node:assert/strict"
import { formatLivestockDate } from "../src/features/farms/livestock-date.ts"

test("Hacienda formats a Postgres session timestamp without shifting the work date", () => {
  const date = formatLivestockDate("2026-11-12")
  assert.equal(date, "12/11/2026")
  assert.equal(formatLivestockDate("2026-11-12T00:00:00+00:00"), date)
  assert.equal(formatLivestockDate("2026-11-12 00:00:00+00"), date)
})

test("Hacienda can render missing or invalid work dates", () => {
  for (const value of [undefined, null, "", "2026-02-30", "invalid"]) {
    assert.equal(formatLivestockDate(value), "Fecha sin registrar")
  }
})
