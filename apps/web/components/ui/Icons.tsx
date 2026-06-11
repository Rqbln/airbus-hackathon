/** Minimal inline SVG icon set — kept here so we don't depend on an icon library. */

type IconProps = { className?: string; size?: number };

const wrap = (path: React.ReactNode) =>
  function Icon({ className = "", size = 16 }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {path}
      </svg>
    );
  };

export const IconDashboard = wrap(
  <>
    <rect x="3" y="3" width="7" height="9" />
    <rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" />
    <rect x="3" y="16" width="7" height="5" />
  </>
);

export const IconPlane = wrap(
  <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19.5 4S15 5.5 13 7l-7-3-2 2 5.5 4-3 3-3-1-1.5 1.5L4.5 16 6 17.5l1.5-1.5 2 2 1.5-1.5-1-3 3-3 4 5.5L17 16l-2 2.5 2.8.7Z" />
);

export const IconCpu = wrap(
  <>
    <rect x="5" y="5" width="14" height="14" rx="1" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
  </>
);

export const IconFile = wrap(
  <>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="14 3 14 9 20 9" />
  </>
);

export const IconAlert = wrap(
  <>
    <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </>
);

export const IconShield = wrap(
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
);

export const IconFlask = wrap(
  <>
    <path d="M9 3h6v5l5 9a3 3 0 0 1-2.6 4.5H6.6A3 3 0 0 1 4 17l5-9V3Z" />
    <line x1="6.5" y1="14" x2="17.5" y2="14" />
  </>
);

export const IconTrendDown = wrap(
  <>
    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
    <polyline points="16 17 22 17 22 11" />
  </>
);

export const IconCheck = wrap(<polyline points="20 6 9 17 4 12" />);

export const IconCircle = wrap(<circle cx="12" cy="12" r="9" />);

export const IconCalendar = wrap(
  <>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </>
);
