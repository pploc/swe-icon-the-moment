/**
 * Spaced repetition, SM-2 flavoured.
 *
 * Review state is per-person and per-device, so localStorage is its natural
 * home — there is no server to sync with, and one exists only if you add a
 * database. Export/import covers moving between machines.
 */
export type Rating = 'again' | 'hard' | 'good' | 'easy'

export interface CardState {
  /** SM-2 ease factor: how fast intervals grow. Starts at 2.5, floors at 1.3. */
  ease: number
  /** Days until the next review. */
  interval: number
  /** Consecutive successful reviews. */
  reps: number
  /** How many times this was forgotten. */
  lapses: number
  /** Epoch ms when it next comes up. */
  due: number
  /** Epoch ms of the last review. */
  last: number
}

export type CardMap = Record<string, CardState>

const KEY = 'itm:srs:v1'
const MIN_EASE = 1.3
const MAX_INTERVAL = 365
const DAY = 24 * 60 * 60 * 1000
/** An interval this long counts as "known" (Anki's mature threshold). */
const MATURE_DAYS = 21

export function loadAll(): CardMap {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as { version: number; cards: CardMap }
    return parsed?.cards ?? {}
  } catch {
    return {}
  }
}

export function saveAll(cards: CardMap): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ version: 1, cards }))
  } catch {
    // Quota or private mode — reviews just won't persist.
  }
}

export function resetAll(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

const FRESH: CardState = {
  ease: 2.5,
  interval: 0,
  reps: 0,
  lapses: 0,
  due: 0,
  last: 0,
}

/**
 * The scheduler. "Again" resets the card and brings it back this session;
 * everything else grows the interval by the ease factor, which itself drifts
 * up or down with how hard the card felt.
 */
export function schedule(
  current: CardState | undefined,
  rating: Rating,
  now: number = Date.now(),
): CardState {
  const card = current ?? FRESH
  let { ease, interval, reps, lapses } = card

  switch (rating) {
    case 'again':
      ease = Math.max(MIN_EASE, ease - 0.2)
      reps = 0
      lapses += 1
      interval = 0
      break

    case 'hard':
      ease = Math.max(MIN_EASE, ease - 0.15)
      interval = reps === 0 ? 1 : Math.max(interval + 1, Math.round(interval * 1.2))
      reps += 1
      break

    case 'good':
      interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(interval * ease)
      reps += 1
      break

    case 'easy':
      ease = ease + 0.15
      interval =
        reps === 0 ? 4 : Math.max(interval + 1, Math.round(interval * ease * 1.3))
      reps += 1
      break
  }

  interval = Math.min(interval, MAX_INTERVAL)

  return {
    ease,
    interval,
    reps,
    lapses,
    // interval 0 means "again this session", so it stays due immediately.
    due: now + interval * DAY,
    last: now,
  }
}

/** What each button would do, for the labels on the rating row. */
export function previewInterval(current: CardState | undefined, rating: Rating): string {
  const next = schedule(current, rating, 0)
  return formatInterval(next.interval)
}

export function formatInterval(days: number): string {
  if (days <= 0) return 'now'
  if (days === 1) return '1d'
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${(days / 365).toFixed(1)}y`
}

export function formatDue(due: number, now: number = Date.now()): string {
  const days = Math.round((due - now) / DAY)
  if (days <= 0) return 'due now'
  return `due in ${formatInterval(days)}`
}

export interface Stats {
  total: number
  unseen: number
  learning: number
  known: number
  due: number
}

export function stats(slugs: string[], cards: CardMap, now: number = Date.now()): Stats {
  let unseen = 0
  let learning = 0
  let known = 0
  let due = 0

  for (const slug of slugs) {
    const card = cards[slug]
    if (!card || card.reps === 0) {
      unseen += 1
      continue
    }
    if (card.interval >= MATURE_DAYS) known += 1
    else learning += 1
    if (card.due <= now) due += 1
  }

  return { total: slugs.length, unseen, learning, known, due }
}

/**
 * Builds a session queue: cards that have come due (oldest first), then unseen
 * ones in random order, capped at `limit`.
 */
export function buildQueue({
  slugs,
  cards,
  includeNew = true,
  onlyDue = true,
  limit = 20,
  now = Date.now(),
}: {
  slugs: string[]
  cards: CardMap
  includeNew?: boolean
  onlyDue?: boolean
  limit?: number
  now?: number
}): string[] {
  const dueCards = slugs
    .filter((slug) => cards[slug] && cards[slug].reps > 0 && cards[slug].due <= now)
    .sort((a, b) => cards[a].due - cards[b].due)

  const fresh = slugs.filter((slug) => !cards[slug] || cards[slug].reps === 0)
  shuffle(fresh)

  if (!onlyDue) {
    const rest = slugs.filter(
      (slug) => !dueCards.includes(slug) && !fresh.includes(slug),
    )
    shuffle(rest)
    return [...dueCards, ...fresh, ...rest].slice(0, limit)
  }

  return [...dueCards, ...(includeNew ? fresh : [])].slice(0, limit)
}

function shuffle(list: string[]): void {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
}

// --- moving progress between devices ----------------------------------------

export function exportProgress(): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), cards: loadAll() }, null, 2)
}

/** Merges an export into local state, keeping whichever review is newer. */
export function importProgress(text: string): number {
  const parsed = JSON.parse(text) as { cards?: CardMap }
  if (!parsed?.cards || typeof parsed.cards !== 'object') {
    throw new Error('That file does not look like a progress export.')
  }

  const current = loadAll()
  let merged = 0

  for (const [slug, incoming] of Object.entries(parsed.cards)) {
    if (typeof incoming?.due !== 'number' || typeof incoming?.ease !== 'number') continue
    const existing = current[slug]
    if (!existing || incoming.last > existing.last) {
      current[slug] = incoming
      merged += 1
    }
  }

  saveAll(current)
  return merged
}
