import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface NavItem {
    path: string;
    label: string;
    icon: (active: boolean) => React.ReactNode;
}

const Icon: React.FC<{
    active: boolean;
    outline: React.ReactNode;
    filled: React.ReactNode;
}> = ({ active, outline, filled }) => (
    <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        {active ? filled : outline}
    </svg>
);

export const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const isActive = (path: string) => location.pathname === path;

    const items: NavItem[] = [
        {
            path: '/',
            label: t('nav.home'),
            icon: (active) => (
                <Icon
                    active={active}
                    outline={
                        <>
                            <path d="M3.5 10.8 12 3.5l8.5 7.3V20a1.5 1.5 0 0 1-1.5 1.5h-3.5v-6.5a1 1 0 0 0-1-1h-5a1 1 0 0 0-1 1v6.5H5A1.5 1.5 0 0 1 3.5 20z" />
                        </>
                    }
                    filled={
                        <path d="M11.35 2.86a1 1 0 0 1 1.3 0l8.5 7.3a1 1 0 0 1 .35.76V20a2.5 2.5 0 0 1-2.5 2.5h-3a1 1 0 0 1-1-1v-6h-4v6a1 1 0 0 1-1 1H5A2.5 2.5 0 0 1 2.5 20v-9.08a1 1 0 0 1 .35-.76z" />
                    }
                />
            ),
        },
        {
            path: '/products',
            label: t('nav.products'),
            icon: (active) => (
                <Icon
                    active={active}
                    outline={
                        <>
                            <rect x="3" y="7.5" width="18" height="13" rx="2.5" />
                            <path d="M9 7.5V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2" />
                            <path d="M3 13h18" />
                        </>
                    }
                    filled={
                        <>
                            <path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7h-2V5.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5V7z" />
                            <path d="M5.5 7A2.5 2.5 0 0 0 3 9.5V12h8v-.5a1 1 0 1 1 2 0v.5h8V9.5A2.5 2.5 0 0 0 18.5 7z" />
                            <path d="M3 14v4.5A2.5 2.5 0 0 0 5.5 21h13a2.5 2.5 0 0 0 2.5-2.5V14h-8v1a1 1 0 1 1-2 0v-1z" />
                        </>
                    }
                />
            ),
        },
        {
            path: '/travel-mates',
            label: t('nav.travel_mates'),
            icon: (active) => (
                <Icon
                    active={active}
                    outline={
                        <>
                            <circle cx="9" cy="8" r="3.5" />
                            <path d="M2.5 20.5a6.5 6.5 0 0 1 13 0" />
                            <circle cx="17" cy="9.5" r="2.8" />
                            <path d="M16.5 14.5c2.76 0 5 2.24 5 5" />
                        </>
                    }
                    filled={
                        <>
                            <circle cx="9" cy="8" r="4" />
                            <path d="M9 14a7 7 0 0 0-7 7 1 1 0 0 0 1 1h12a1 1 0 0 0 1-1 7 7 0 0 0-7-7z" />
                            <circle cx="17" cy="9.5" r="3" />
                            <path d="M17 14a5.8 5.8 0 0 0-1.77.28 8.6 8.6 0 0 1 2.5 5.72h4a1 1 0 0 0 1-1 6 6 0 0 0-5.73-5z" />
                        </>
                    }
                />
            ),
        },
        {
            path: '/reviews',
            label: t('nav.reviews'),
            icon: (active) => (
                <Icon
                    active={active}
                    outline={
                        <>
                            <path d="M20.5 13a7.5 7.5 0 0 1-11.25 6.5L4 21l1.5-5.25A7.5 7.5 0 1 1 20.5 13z" />
                            <path d="M8.5 11h7" />
                            <path d="M8.5 14.5h4.5" />
                        </>
                    }
                    filled={
                        <path d="M13 2.5a10 10 0 0 0-8.91 14.49L2.57 21.5a1 1 0 0 0 1.22 1.28l4.66-1.36A10 10 0 1 0 13 2.5zm-4.5 9.5a1 1 0 0 1 0-2h7a1 1 0 1 1 0 2zm0 3.5a1 1 0 1 1 0-2H13a1 1 0 1 1 0 2z" />
                    }
                />
            ),
        },
        {
            path: '/mypage',
            label: t('nav.my_page'),
            icon: (active) => (
                <Icon
                    active={active}
                    outline={
                        <>
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 21a8 8 0 0 1 16 0" />
                        </>
                    }
                    filled={
                        <>
                            <circle cx="12" cy="8" r="4.5" />
                            <path d="M12 13.5a8.5 8.5 0 0 0-8.5 8.5 1 1 0 0 0 1 1h15a1 1 0 0 0 1-1 8.5 8.5 0 0 0-8.5-8.5z" />
                        </>
                    }
                />
            ),
        },
    ];

    return (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/95 dark:bg-background-dark/95 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800/60 pb-safe pt-1.5 px-2 z-50 h-[84px]">
            <div className="flex justify-between items-start max-w-md mx-auto h-full">
                {items.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`relative flex-1 flex flex-col items-center justify-start gap-1 pt-2 transition-transform active:scale-90 ${
                                active
                                    ? 'text-primary'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                            aria-label={item.label}
                            aria-current={active ? 'page' : undefined}
                        >
                            {/* Active indicator pill */}
                            <span
                                className={`absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-full bg-primary transition-all duration-300 ${
                                    active ? 'w-7 opacity-100' : 'w-0 opacity-0'
                                }`}
                            />
                            <span
                                className={`transition-transform duration-200 ${
                                    active ? 'scale-105' : 'scale-100'
                                }`}
                            >
                                {item.icon(active)}
                            </span>
                            <span
                                className={`text-[10px] tracking-tight leading-none ${
                                    active ? 'font-bold' : 'font-medium'
                                }`}
                            >
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
