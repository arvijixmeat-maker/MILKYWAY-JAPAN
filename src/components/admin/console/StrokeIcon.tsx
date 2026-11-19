import React from 'react';

/**
 * 관리자 콘솔 리디자인(2026-11)용 선 아이콘 — Claude Design 「MILKYWAY 관리자 콘솔 리디자인」의
 * 인라인 SVG 를 그대로 옮긴 것. 글꼴 아이콘(Material Symbols)과 달리 서브셋 등록이 필요 없다.
 * 이름은 Material Symbols 이름과 겹치지 않게 지었다(빌드의 아이콘 검사가 오인하지 않도록).
 */
const SHAPES = {
    navDash: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
    navBooking: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 3h6v3H9zM9 11h6M9 15h4" /></>,
    navBed: <><path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" /><circle cx="7" cy="11" r="2" /></>,
    navCal: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    navBox: <><path d="M21 8l-9-5-9 5v8l9 5 9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></>,
    navMagazine: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 21V5M8 7h7" /></>,
    navLayers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
    navStar: <path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17l-5.4 2.8 1.1-6.1L3.2 9.4l6.1-.8z" />,
    navHelp: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 0 1 4.9.7c0 1.7-2.4 2.3-2.4 3.8M12 17.5v.01" /></>,
    navMail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
    navScreen: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
    navHorn: <><path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z" /><path d="M17 9a4 4 0 0 1 0 6" /></>,
    navTag: <><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" /><circle cx="7.5" cy="7.5" r="1.5" /></>,
    navBuilding: <><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4" /></>,
    navPin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
    navPhoto: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></>,
    navGlobe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
    uiSearch: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
    uiBell: <><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
    uiChevDown: <path d="M6 9l6 6 6-6" />,
    uiChevRight: <path d="M9 6l6 6-6 6" />,
    uiSignOut: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />,
    uiBars: <path d="M4 7h16M4 12h16M4 17h16" />,
    uiCross: <path d="M6 6l12 12M18 6L6 18" />,
    uiDoc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
    uiCard: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
    uiCheck: <><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>,
    uiAlert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></>,
    uiRetry: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />,
    uiPeople: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></>,
} as const;

export type StrokeIconName = keyof typeof SHAPES;

export const StrokeIcon: React.FC<{ name: StrokeIconName; size?: number; strokeWidth?: number; color?: string; className?: string }> = ({
    name, size = 20, strokeWidth = 1.5, color = 'currentColor', className,
}) => (
    <svg
        className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
        strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}
    >
        {SHAPES[name]}
    </svg>
);

export default StrokeIcon;
