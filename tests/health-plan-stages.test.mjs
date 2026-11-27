import assert from "node:assert/strict"
import test from "node:test"
import { healthPlanStageFor } from "../src/features/farms/health-plan-stages.ts"

test("stages follow the group and the month in the source calendar", () => {
  assert.equal(healthPlanStageFor("Vacas", 1), "servicio")
  assert.equal(healthPlanStageFor("Vacas", 8), "paricion")
  assert.equal(healthPlanStageFor("Vacas paridas de otoño", 8), "general")
  assert.equal(healthPlanStageFor("Vacas paridas de otoño", 3), "paricion")
  assert.equal(healthPlanStageFor("Terneros de otoño al pie", 3), "paricion")
  assert.equal(healthPlanStageFor("Toros", 11), "servicio")
  assert.equal(healthPlanStageFor("Toros", 12), "general")
  assert.equal(healthPlanStageFor("Invernada", 11), "general")
})
