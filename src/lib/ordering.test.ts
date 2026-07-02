import { describe, it, expect } from 'vitest'
import { computeOrder, type OrderInput, type OrderOptions } from './ordering'
import type { Gender } from '../types/db'

// Compact builder: "m" = man first-time, "M" = man multiple,
// "w"/"W" = woman first/multiple, "e"/"E" = enby first/multiple.
function make(spec: string): OrderInput[] {
  const genderOf: Record<string, Gender> = {
    m: 'man',
    w: 'woman',
    e: 'enby',
  }
  return spec.split(' ').map((tok, i) => ({
    id: i + 1,
    position: i + 1,
    gender: genderOf[tok.toLowerCase()],
    is_first_time: tok === tok.toLowerCase(),
    skipped: false,
  }))
}

const ids = (entries: OrderInput[]) => entries.map((e) => e.id)
const NONE: OrderOptions = { rule1: false, rule2: false }

describe('computeOrder', () => {
  it('keeps base order (by position) when no rules are enabled', () => {
    const list = make('M m W e M')
    expect(ids(computeOrder(list, NONE))).toEqual([1, 2, 3, 4, 5])
  })

  it('rule 1: first-timers before multiple-timers, but not the locked top 2', () => {
    // positions 1,2 locked (M, M). Rest: m(3) W(4) m(5) -> first-timers first.
    const list = make('M M m W m')
    // rest [m3, W4, m5] -> first: m3,m5 ; multi: W4  => m3,m5,W4
    expect(ids(computeOrder(list, { rule1: true, rule2: false }))).toEqual([
      1, 2, 3, 5, 4,
    ])
  })

  it('rule 2: pulls a lone woman to the front of the unlocked rest', () => {
    // 5 men + 1 woman; positions 1,2 locked. Woman should land at position 3.
    const list = make('M M M M M W') // all multiple-time men + 1 multiple woman
    const out = computeOrder(list, { rule1: false, rule2: true })
    // pinned: ids 1,2 ; rest ids [3,4,5,6] genders [m,m,m,W] -> zebra [W6,m3,m4,m5]
    expect(ids(out)).toEqual([1, 2, 6, 3, 4, 5])
    expect(out[2].gender).toBe('woman') // position 3 is the woman
  })

  it('rule 2: alternates when enough of each gender', () => {
    // rest positions 3.. : m m W W  -> zebra starting w/enby: W m W m
    const list = make('M M m m W W')
    const out = computeOrder(list, { rule1: false, rule2: true })
    expect(ids(out)).toEqual([1, 2, 5, 3, 6, 4])
  })

  it('rule 1 + rule 2: rule 1 wins, zebra applied within each group', () => {
    // rest: first-timers [m3, w4], multi [M5, W6]
    const list = make('M M m w M W')
    const out = computeOrder(list, { rule1: true, rule2: true })
    // zebra(first=[m3,w4]) -> [w4,m3]; zebra(multi=[M5,W6]) -> [W6,M5]
    expect(ids(out)).toEqual([1, 2, 4, 3, 6, 5])
  })

  it('locking: the top 2 are never overtaken', () => {
    // Even with rule 1 on, the multiple-timers locked at 1,2 stay ahead of a
    // first-timer at position 3.
    const list = make('M M m')
    expect(ids(computeOrder(list, { rule1: true, rule2: true }))).toEqual([
      1, 2, 3,
    ])
  })

  it('is idempotent: re-running on renumbered output is stable', () => {
    const opts: OrderOptions = { rule1: true, rule2: true }
    const first = computeOrder(make('M M m w M W e'), opts)
    // renumber positions to match the computed order, then recompute
    const renumbered = first.map((e, i) => ({ ...e, position: i + 1 }))
    const second = computeOrder(renumbered, opts)
    expect(ids(second)).toEqual(ids(first))
  })
})
