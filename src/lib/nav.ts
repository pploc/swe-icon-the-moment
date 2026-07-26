import { groups } from '@/generated/content'

const GROUP_ORDER = ['fundamentals', 'backend', 'infrastructure', 'career']

/** Group ids in display order — known ones first, any new ones appended. */
export function orderedGroupIds(): string[] {
  return [
    ...GROUP_ORDER.filter((id) => id in groups),
    ...Object.keys(groups).filter((id) => !GROUP_ORDER.includes(id)),
  ]
}
