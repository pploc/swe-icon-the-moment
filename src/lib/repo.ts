/** Everything that points back at the GitHub repo lives here. */
export const REPO_URL = 'https://github.com/pploc/swe-icon-the-moment'

/** Pre-filled "new file" page so a question can be added from the browser. */
export const NEW_QUESTION_URL = `${REPO_URL}/new/main/content/questions`

export function editUrl(source: string): string {
  return `${REPO_URL}/edit/main/${source}`
}

export function sourceUrl(source: string): string {
  return `${REPO_URL}/blob/main/${source}`
}
