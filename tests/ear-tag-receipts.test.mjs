import test from "node:test"
import assert from "node:assert/strict"
import { summarizeTagReceipts } from "../src/features/ear-tags/ear-tag-receipts.ts"

const eid = value => String(value).padStart(15, "0")
const range = (first, last, sex) => ({ first: eid(first), last: eid(last), quantity: last - first + 1, sex })
const receipt = (id, ranges, gallagherGroupId, renspaId = "field-1") => ({
  id, renspaId, gallagherGroupId, receivedOn: "2026-11-21", ranges,
  first: ranges[0].first, last: ranges.at(-1).last,
  quantity: ranges.reduce((sum, item) => sum + item.quantity, 0),
})

test("one reception sums both sexes without merging separate receptions on the same date", () => {
  const rows = summarizeTagReceipts([
    receipt("bag-1", [range(100, 124, "macho"), range(125, 149, "hembra")]),
    receipt("bag-2", [range(200, 200, "hembra")]),
  ])
  assert.equal(rows.length, 2)
  assert.deepEqual(rows[0], {
    id: "receipt:bag-1", renspaId: "field-1", receivedOn: "2026-11-21",
    first: eid(100), last: eid(149), total: 50, male: 25, female: 25, hasGaps: false,
  })
})

test("sparse Gallagher runs are summarized by original group and RENSPA, with actual counts", () => {
  const rows = summarizeTagReceipts([
    receipt("run-2", [range(105, 106, "hembra")], "group"),
    receipt("run-1", [range(100, 101, "hembra")], "group"),
    receipt("other-field", [range(250, 250, "hembra")], "group", "field-2"),
    receipt("other-group", [range(300, 300, "hembra")], "another"),
  ])
  assert.equal(rows.length, 3)
  assert.deepEqual(rows[0], {
    id: "gallagher:field-1:group", renspaId: "field-1", receivedOn: "2026-11-21",
    first: eid(100), last: eid(106), total: 4, male: 0, female: 4, hasGaps: true,
  })
})
