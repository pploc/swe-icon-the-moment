import type { ReactNode } from 'react'

/** 16px stroke icons, drawn inline so nothing is fetched at runtime. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const IconBold = () => (
  <Icon>
    <path d="M6 4h7a4 4 0 0 1 0 8H6z" />
    <path d="M6 12h8a4 4 0 0 1 0 8H6z" />
  </Icon>
)

export const IconItalic = () => (
  <Icon>
    <line x1="19" y1="4" x2="10" y2="4" />
    <line x1="14" y1="20" x2="5" y2="20" />
    <line x1="15" y1="4" x2="9" y2="20" />
  </Icon>
)

export const IconStrike = () => (
  <Icon>
    <path d="M16 5H10a3 3 0 0 0-1.8 5.4" />
    <path d="M8 19h7a3 3 0 0 0 1.4-5.6" />
    <line x1="3" y1="12" x2="21" y2="12" />
  </Icon>
)

export const IconCode = () => (
  <Icon>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </Icon>
)

export const IconCodeBlock = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="16" rx="1" />
    <polyline points="9 10 7 12 9 14" />
    <polyline points="15 10 17 12 15 14" />
  </Icon>
)

export const IconLink = () => (
  <Icon>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </Icon>
)

export const IconImage = () => (
  <Icon>
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </Icon>
)

export const IconListBullet = () => (
  <Icon>
    <line x1="9" y1="6" x2="20" y2="6" />
    <line x1="9" y1="12" x2="20" y2="12" />
    <line x1="9" y1="18" x2="20" y2="18" />
    <circle cx="4.5" cy="6" r="1" />
    <circle cx="4.5" cy="12" r="1" />
    <circle cx="4.5" cy="18" r="1" />
  </Icon>
)

export const IconListNumber = () => (
  <Icon>
    <line x1="10" y1="6" x2="20" y2="6" />
    <line x1="10" y1="12" x2="20" y2="12" />
    <line x1="10" y1="18" x2="20" y2="18" />
    <path d="M4 4h1v4" />
    <path d="M3.5 12.5h2l-2 3h2" />
    <path d="M3.5 17h2v3h-2" />
  </Icon>
)

export const IconTask = () => (
  <Icon>
    <polyline points="9 11 12 14 20 6" />
    <path d="M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10" />
  </Icon>
)

export const IconQuote = () => (
  <Icon>
    <path d="M7 15a3 3 0 1 1 0-6c0-2 1-3.5 3-4.5" />
    <path d="M17 15a3 3 0 1 1 0-6c0-2 1-3.5 3-4.5" />
  </Icon>
)

export const IconHeading = () => (
  <Icon>
    <path d="M5 4v16" />
    <path d="M14 4v16" />
    <path d="M5 12h9" />
    <path d="M18 20v-6l3 3-3 3" />
  </Icon>
)

export const IconTable = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="16" rx="1" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="9" y1="10" x2="9" y2="20" />
    <line x1="15" y1="10" x2="15" y2="20" />
  </Icon>
)

export const IconRule = () => (
  <Icon>
    <line x1="3" y1="12" x2="21" y2="12" />
  </Icon>
)

export const IconDiagram = () => (
  <Icon>
    <rect x="3" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="16" width="7" height="5" rx="1" />
    <path d="M6.5 8v6a2 2 0 0 0 2 2h5.5" />
  </Icon>
)

export const IconCallout = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="11" x2="12" y2="16" />
    <line x1="12" y1="8" x2="12" y2="8" />
  </Icon>
)

export const IconMath = () => (
  <Icon>
    <path d="M6 5h11L10 12l7 7H6" />
  </Icon>
)

export const IconEye = () => (
  <Icon>
    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z" />
    <circle cx="12" cy="12" r="2.5" />
  </Icon>
)

export const IconPencil = () => (
  <Icon>
    <path d="M4 20h4l10-10-4-4L4 16z" />
    <line x1="14" y1="6" x2="18" y2="10" />
  </Icon>
)
