import type { SVGProps } from 'react'

export type IconName =
  | 'home'
  | 'users'
  | 'video'
  | 'play'
  | 'book'
  | 'clipboard'
  | 'flask'
  | 'sparkles'
  | 'calendar'
  | 'chart'
  | 'library'
  | 'help'
  | 'award'
  | 'download'
  | 'bell'
  | 'message'
  | 'user'
  | 'shield'
  | 'school'
  | 'settings'
  | 'plug'
  | 'search'
  | 'filter'
  | 'plus'
  | 'check'
  | 'x'
  | 'chevronDown'
  | 'chevronRight'
  | 'arrowRight'
  | 'arrowLeft'
  | 'logout'
  | 'menu'
  | 'wifiOff'
  | 'wifi'
  | 'zap'
  | 'clock'
  | 'alert'
  | 'info'
  | 'trash'
  | 'edit'
  | 'upload'
  | 'lock'
  | 'eye'
  | 'star'
  | 'medal'
  | 'flame'
  | 'link'
  | 'mail'
  | 'phone'
  | 'globe'
  | 'file'
  | 'external'
  | 'checkCircle'
  | 'xCircle'
  | 'database'
  | 'refresh'
  | 'copy'
  | 'bookmark'
  | 'graduation'
  | 'heart'
  | 'leaf'
  | 'sun'
  | 'flaskRound'
  | 'beaker'
  | 'cloud'
  | 'image'

const paths: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9.5 21v-6h5v6',
  users: 'M16 19v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V19M9 9.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 3.6a3.5 3.5 0 0 1 0 6.8M22 19v-1.5a4 4 0 0 0-3-3.8',
  video: 'M15 10.5 21 7v10l-6-3.5M3 7.5A2.5 2.5 0 0 1 5.5 5h7A2.5 2.5 0 0 1 15 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 3 16.5v-9Z',
  play: 'M8 5.5v13l11-6.5-11-6.5Z',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13ZM4 17.5h16',
  clipboard: 'M9 4h6v3H9V4Zm-2 2H5.5A1.5 1.5 0 0 0 4 7.5v12A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 18.5 6H17M8 12h8M8 16h5',
  flask: 'M9 3h6M10 3v6.2L4.7 18a2 2 0 0 0 1.7 3h11.2a2 2 0 0 0 1.7-3L14 9.2V3M7.5 15h9',
  sparkles: 'm12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3ZM19 14l.9 2.3L22 17l-2.1.7L19 20l-.9-2.3L16 17l2.1-.7L19 14ZM5 14l.7 1.8L7.5 16l-1.8.7L5 18.5l-.7-1.8L2.5 16l1.8-.7L5 14Z',
  calendar: 'M7 3v3M17 3v3M4 9h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v13A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5v-13A1.5 1.5 0 0 1 5.5 5ZM8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V7M16 16v-8',
  library: 'M4 4h4v16H4V4ZM10 4h4v16h-4V4ZM17 5l3-.5 2.5 15-3 .5L17 5Z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.6 9a2.5 2.5 0 1 1 3.8 2.2c-.9.6-1.4 1.1-1.4 2.1M12 17h.01',
  award: 'M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM8.5 13 7 22l5-3 5 3-1.5-9',
  download: 'M12 3v12M7 10.5l5 5 5-5M5 20h14',
  bell: 'M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6ZM10 20a2 2 0 0 0 4 0',
  message: 'M21 12a8 8 0 0 1-8 8H8l-5 2 1.7-4.6A8 8 0 1 1 21 12Z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  shield: 'M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10ZM9 12l2 2 4-4',
  school: 'M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M9 11h.01M15 11h.01',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
  plug: 'M9 3v6M15 3v6M6 9h12v3a6 6 0 0 1-12 0V9ZM12 18v3',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 13 4 4L19 7',
  x: 'M6 6l12 12M18 6 6 18',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  arrowRight: 'M4 12h16M14 6l6 6-6 6',
  arrowLeft: 'M20 12H4M10 6l-6 6 6 6',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  menu: 'M4 7h16M4 12h16M4 17h16',
  wifiOff: 'M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 3.5-2.2M15.5 10.3A10 10 0 0 1 19 12.5M2 8.8A15 15 0 0 1 6.5 6M17.5 6A15 15 0 0 1 22 8.8M12 20h.01',
  wifi: 'M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 8.8a15 15 0 0 1 20 0M12 20h.01',
  zap: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  alert: 'M12 3 2 21h20L12 3ZM12 9v5M12 18h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8h.01',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  edit: 'M4 20h4L20 8l-4-4L4 16v4ZM14 6l4 4',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  lock: 'M6 10h12v11H6V10ZM8 10V7a4 4 0 0 1 8 0v3M12 15v2',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z',
  medal: 'M7 3h10v6a5 5 0 0 1-10 0V3ZM12 14v7M8 21h8M9 6h6',
  flame: 'M12 22c4 0 7-2.7 7-6.5 0-3-2-5.5-3.5-7.5C14 6 13 4 13 2c-2 2-3 4.5-3 7-1-.5-1.5-1.5-2-2.5C7 9 6 11 6 14c0 4 3 8 6 8Z',
  link: 'M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1',
  mail: 'M3 6h18v12H3V6ZM3 7l9 6 9-6',
  phone: 'M22 16.9v2a2 2 0 0 1-2.2 2 19 19 0 0 1-8.3-3 19 19 0 0 1-5.8-5.8 19 19 0 0 1-3-8.3A2 2 0 0 1 4.8 2h2a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.4 2.1L8 9.4a16 16 0 0 0 6 6l1-1a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16.9Z',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.4 4 5.7 4 9s-1.5 6.6-4 9c-2.5-2.4-4-5.7-4-9s1.5-6.6 4-9Z',
  file: 'M14 3H6v18h12V7l-4-4ZM14 3v4h4M9 13h6M9 17h6',
  external: 'M14 3h7v7M21 3l-9 9M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5',
  checkCircle: 'M21 12a9 9 0 1 1-4-7.4M21 5l-9 9-3-3',
  xCircle: 'M21 12a9 9 0 1 1-4-7.4M15 9l-6 6M9 9l6 6',
  database: 'M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3ZM4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  refresh: 'M21 12a9 9 0 1 1-3-6.7M21 3v6h-6',
  copy: 'M9 9h11v11H9V9ZM5 15H4V4h11v1',
  bookmark: 'M6 3h12v18l-6-4-6 4V3Z',
  graduation: 'M2 9l10-5 10 5-10 5L2 9ZM6 11.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5M22 9v6',
  heart: 'M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  leaf: 'M21 3c-9 0-16 4-16 11a6 6 0 0 0 6 6c7 0 10-7 10-17ZM3 21c2-5 5-8 10-11',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  flaskRound: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7 16h10',
  beaker: 'M6 3h12M7 3v15a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3V3M7 14h10',
  cloud: 'M18 18a4 4 0 0 0 .5-8 6 6 0 0 0-11.6-1.5A4.5 4.5 0 0 0 7 18h11Z',
  image: 'M3 5h18v14H3V5ZM3 16l5-5 4 4 3-3 6 6M15 9h.01',
}

interface Props extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 20, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  )
}
