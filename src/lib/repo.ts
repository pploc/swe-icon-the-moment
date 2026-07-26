/** Everything that points back at the GitHub repo lives here. */
export const REPO_URL = 'https://github.com/pploc/swe-icon-the-moment'

/**
 * GitHub's "create new file" editor, pre-filled via query params. Committing
 * there (directly, or via the fork-and-PR flow GitHub offers to non-writers)
 * triggers CI validation and a redeploy.
 */
export function newFileUrl(filename: string, content: string): string {
  return `${REPO_URL}/new/main/content/questions?filename=${encodeURIComponent(
    filename,
  )}&value=${encodeURIComponent(content)}`
}

export function editUrl(source: string): string {
  return `${REPO_URL}/edit/main/${source}`
}

export function sourceUrl(source: string): string {
  return `${REPO_URL}/blob/main/${source}`
}
