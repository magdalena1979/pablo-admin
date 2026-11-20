import test from 'node:test'
import assert from 'node:assert/strict'
import { readingMonth, groupMonthlyReadings } from '../src/features/livestock/monthly-readings.ts'
test('month follows Argentina date across UTC month boundary',()=>{
 assert.equal(readingMonth('2025-06-01T01:00:00Z'),'2025-05')
 assert.equal(readingMonth('2025-06-01T13:00:00Z'),'2025-06')
})
test('monthly view retains separate readings, years and animals without replacing older fields',()=>{
 const readings=[{id:'b',animalId:'1',date:'2025-05-20T12:00:00Z',month:'2025-05',fields:{}},{id:'a',animalId:'1',date:'2025-05-02T12:00:00Z',month:'2025-05',fields:{APLOMO:'Yes'}},{id:'c',animalId:'2',date:'2026-05-02T12:00:00Z',month:'2026-05',fields:{}}]
 const result=groupMonthlyReadings(readings)
 assert.deepEqual(result['1']['2025-05'].map(row=>row.id),['a','b'])
 assert.equal(result['2']['2026-05'].length,1)
 assert.equal(result['1']['2025-05'][0].fields.APLOMO,'Yes')
 assert.equal(readings[0].id,'b')
})
