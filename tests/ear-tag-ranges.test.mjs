import test from "node:test"
import assert from "node:assert/strict"
import { lastEidFromQuantity, rangesFromQuantities, rangeQuantity, validateTagBag } from "../src/features/ear-tags/ear-tag-ranges.ts"

const first = "032010033119425", last = "032010033119449"
const split = [
  { first, last: "032010033119434", sex: "macho" },
  { first: "032010033119435", last, sex: "hembra" },
]
test("quantities partition the bag consecutively without retyping identifiers", () => {
  const ranges = rangesFromQuantities(first, [{ quantity: "10", sex: "macho" }, { quantity: "15", sex: "hembra" }])
  assert.deepEqual(ranges, split)
  assert.equal(validateTagBag(first, last, "25", ranges).quantity, 25)
  const edited = rangesFromQuantities(first, [{ quantity: "5", sex: "macho" }, { quantity: "20", sex: "hembra" }])
  assert.equal(edited[1].first, "032010033119430")
  assert.equal(edited[1].last, last)
})
test("incomplete quantities do not produce misleading later endpoints", () => {
  const ranges = rangesFromQuantities(first, [{ quantity: "", sex: "macho" }, { quantity: "15", sex: "hembra" }])
  assert.equal(ranges[0].last, "")
  assert.equal(ranges[1].first, "")
  assert.equal(ranges[1].last, "")
})
test("last EID is inclusive, preserves leading zeros and carries digits", () => {
  assert.equal(lastEidFromQuantity(first, "25"), last)
  assert.equal(lastEidFromQuantity(first, "1"), first)
  assert.equal(lastEidFromQuantity("032010033119999", "2"), "032010033120000")
  assert.equal(lastEidFromQuantity("032 010033119425", "25"), last)
})
test("invalid quantity, incomplete EID and overflow clear the computed endpoint", () => {
  for (const quantity of ["", "0", "-1", "1.5", "10001", "abc"]) assert.equal(lastEidFromQuantity(first, quantity), "")
  assert.equal(lastEidFromQuantity("032", "25"), "")
  assert.equal(lastEidFromQuantity("999999999999999", "2"), "")
})
test("bag example: inclusive count, two sexes, leading zeros retained", () => {
  const checked = validateTagBag(first, last, "25", split)
  assert.equal(checked.quantity, 25)
  assert.deepEqual(checked.ranges.map(range => range.quantity), [10, 15])
  assert.equal(checked.first, first)
})
test("whitespace is normalized and unordered ranges are sorted", () => {
  const checked = validateTagBag("032 010033119425", last, "25", [...split].reverse())
  assert.equal(checked.first, first)
  assert.equal(checked.ranges[0].sex, "macho")
})
test("one tag and whole-bag allocation are valid", () => {
  assert.equal(rangeQuantity(first, first), 1)
  assert.equal(validateTagBag(first, first, "1", [{ first, last: first, sex: "hembra" }]).ranges[0].quantity, 1)
})
test("shared endpoints overlap because both endpoints are included", () => {
  assert.throws(() => validateTagBag(first, last, "25", [split[0], { ...split[1], first: split[0].last }]), /superpuestos/)
})
test("gaps, missing tail, out-of-bag ranges and reversed ranges are rejected", () => {
  assert.throws(() => validateTagBag(first, last, "25", [split[0], { ...split[1], first: "032010033119436" }]), /sin destino/)
  assert.throws(() => validateTagBag(first, last, "25", [split[0]]), /todas/)
  assert.throws(() => validateTagBag(first, last, "25", [{ ...split[0], first: "032010033119424" }, split[1]]), /fuera/)
  assert.throws(() => validateTagBag(first, last, "25", [{ first: last, last: first, sex: "macho" }]), /Revisá/)
})
test("invalid identifiers, quantities and missing destinations are rejected", () => {
  for (const invalid of ["32010033119425", "03201003311942A", "032-010033119425", ""]) {
    assert.equal(rangeQuantity(invalid, last), null)
    assert.throws(() => validateTagBag(invalid, last, "25", split))
  }
  for (const invalid of ["24", "25.5", "", "-25"]) assert.throws(() => validateTagBag(first, last, invalid, split), /cantidad/)
  assert.throws(() => validateTagBag(first, last, "25", [{ first, last, sex: "" }]), /Seleccioná/)
  assert.throws(() => validateTagBag(first, last, "25", []), /al menos/)
})
test("excessively large ranges are blocked before expanding identifiers", () => {
  assert.throws(() => validateTagBag("032010033110000", "032010033120000", "10001", []), /10000/)
})
