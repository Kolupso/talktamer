import type { Gender } from '../types/db'

/**
 * The waiting-list ordering engine. Pure and deterministic so it can be unit
 * tested and produce the same result on every window.
 *
 * Model:
 *  - `position` is the persisted order (1..N). The two lowest positions are
 *    LOCKED (positions 1 & 2) — no rule may move them. Everything else (the
 *    "rest") is re-sorted by the enabled rules, using the current position as
 *    the stable base order.
 *  - Rule 1: first-time speakers before multiple-time speakers.
 *  - Rule 2: zebra striping — alternate woman/enby and man, starting with
 *    woman/enby, pulling the under-represented gender forward.
 *  - Rule 1 has priority over Rule 2: split first/multiple, zebra within each.
 *
 * computeOrder is idempotent: feeding its own output back in yields the same
 * order, so a reconcile loop converges and stops writing.
 */

export interface OrderInput {
  id: number
  position: number
  gender: Gender
  is_first_time: boolean
  skipped: boolean
}

export interface OrderOptions {
  rule1: boolean
  rule2: boolean
}

/** How many top positions are locked and exempt from rule re-ordering. */
export const LOCKED_COUNT = 2

function zebra<T extends OrderInput>(items: T[]): T[] {
  const wnb = items.filter((i) => i.gender !== 'man')
  const men = items.filter((i) => i.gender === 'man')
  const out: T[] = []
  let iw = 0
  let im = 0
  let takeWnb = true // start with woman/enby
  while (iw < wnb.length || im < men.length) {
    if (takeWnb) {
      out.push(iw < wnb.length ? wnb[iw++] : men[im++])
    } else {
      out.push(im < men.length ? men[im++] : wnb[iw++])
    }
    takeWnb = !takeWnb
  }
  return out
}

function applyRules<T extends OrderInput>(items: T[], opts: OrderOptions): T[] {
  const first = items.filter((i) => i.is_first_time)
  const multi = items.filter((i) => !i.is_first_time)

  if (opts.rule1 && opts.rule2) return [...zebra(first), ...zebra(multi)]
  if (opts.rule1) return [...first, ...multi]
  if (opts.rule2) return zebra(items)
  return items
}

export function computeOrder<T extends OrderInput>(
  entries: T[],
  opts: OrderOptions,
): T[] {
  const base = [...entries].sort(
    (a, b) => a.position - b.position || a.id - b.id,
  )
  const pinned = base.slice(0, LOCKED_COUNT)
  const rest = base.slice(LOCKED_COUNT)
  return [...pinned, ...applyRules(rest, opts)]
}
