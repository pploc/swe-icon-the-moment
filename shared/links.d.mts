export interface LinkIndexEntry {
  slug: string
  title: string
  tokens: Set<string>
}

export declare function buildIndex(
  questions: { slug: string; title: string }[],
): LinkIndexEntry[]

export declare function prepareBody(
  markdown: string,
  options?: {
    index?: LinkIndexEntry[]
    base?: string
    selfSlug?: string
    onError?: (message: string) => void
  },
): string
