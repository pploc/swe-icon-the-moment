/**
 * Direct commits from the browser, using a GitHub token the user pastes in.
 *
 * There is no backend — the token is held in this browser's localStorage and
 * sent only to api.github.com. Use a fine-grained token scoped to this one
 * repository with Contents: read & write, and nothing else.
 */
const OWNER = 'pploc'
const REPO = 'swe-icon-the-moment'
const BRANCH = 'main'
const TOKEN_KEY = 'itm:gh-token'

export interface Identity {
  login: string
  canWrite: boolean
}

export function getToken(): string {
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token.trim())
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY)
}

export function hasToken(): boolean {
  return getToken().length > 0
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${getToken()}`,
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body: { message?: string }) => body?.message)
      .catch(() => null)

    if (response.status === 401) throw new Error('Token rejected — check or re-paste it.')
    if (response.status === 403) {
      throw new Error(detail ?? 'Token lacks permission for this repository.')
    }
    if (response.status === 409) {
      throw new Error('The file changed on GitHub since you loaded it — reload and redo the edit.')
    }
    throw new Error(detail ?? `GitHub returned ${response.status}.`)
  }

  return response.json() as Promise<T>
}

/** Confirms the token works and can actually push to this repo. */
export async function verifyToken(): Promise<Identity> {
  const repo = await api<{ permissions?: { push?: boolean } }>(`/repos/${OWNER}/${REPO}`)
  const user = await api<{ login: string }>('/user').catch(() => ({ login: 'token' }))
  return { login: user.login, canWrite: repo.permissions?.push === true }
}

/** Base64 for the Contents API, UTF-8 safe and chunked for long files. */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

/** Current blob sha of a file, or null when it doesn't exist yet. */
export async function fileSha(path: string): Promise<string | null> {
  try {
    const file = await api<{ sha: string }>(
      `/repos/${OWNER}/${REPO}/contents/${encodeURI(path)}?ref=${BRANCH}`,
    )
    return file.sha
  } catch {
    return null
  }
}

export interface CommitResult {
  commitUrl: string
  actionsUrl: string
}

/** Creates or updates a file on `main`, which triggers the deploy workflow. */
export async function commitFile({
  path,
  content,
  message,
}: {
  path: string
  content: string
  message: string
}): Promise<CommitResult> {
  const sha = await fileSha(path)

  const result = await api<{ commit: { html_url: string } }>(
    `/repos/${OWNER}/${REPO}/contents/${encodeURI(path)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: toBase64(content),
        branch: BRANCH,
        ...(sha ? { sha } : {}),
      }),
    },
  )

  return {
    commitUrl: result.commit.html_url,
    actionsUrl: `https://github.com/${OWNER}/${REPO}/actions`,
  }
}

/** Waits for a just-created fork to become usable (GitHub forks async). */
async function waitForFork(login: string): Promise<void> {
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      await api(`/repos/${login}/${REPO}`)
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }
  throw new Error('Fork is taking too long to appear — try again in a moment.')
}

export interface ProposalResult {
  pullRequestUrl: string
}

/**
 * The contributor path: fork (if needed) → branch → commit → pull request.
 * Used when the token can read the repo but not push to it, so nothing lands
 * on main without review.
 */
export async function proposeViaPullRequest({
  path,
  content,
  message,
  body,
}: {
  path: string
  content: string
  message: string
  body: string
}): Promise<ProposalResult> {
  const { login } = await api<{ login: string }>('/user')

  try {
    await api(`/repos/${login}/${REPO}`)
  } catch {
    await api(`/repos/${OWNER}/${REPO}/forks`, { method: 'POST' })
    await waitForFork(login)
  }

  // Branch off upstream's current main. Forks share GitHub's object store, so
  // the fork can reference an upstream commit directly.
  const ref = await api<{ object: { sha: string } }>(
    `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`,
  )
  const branch = `question/${path.split('/').pop()?.replace(/\.md$/, '') ?? 'change'}-${Date.now().toString(36)}`

  await api(`/repos/${login}/${REPO}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: ref.object.sha }),
  })

  const sha = await fileSha(path)

  await api(`/repos/${login}/${REPO}/contents/${encodeURI(path)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: toBase64(content),
      branch,
      ...(sha ? { sha } : {}),
    }),
  })

  const pull = await api<{ html_url: string }>(`/repos/${OWNER}/${REPO}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title: message,
      head: `${login}:${branch}`,
      base: BRANCH,
      body,
      maintainer_can_modify: true,
    }),
  })

  return { pullRequestUrl: pull.html_url }
}

export const TOKEN_SETUP_URL =
  'https://github.com/settings/personal-access-tokens/new'
