import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MW, MW_FONT } from '../desktop-primitives/mwTokens';

interface NavItem {
    path: string;
    label: string;
    d: string;
    match: (pathname: string) => boolean;
}

// Stroke icons from the Claude Design mobile tab bar.
const ICON = {
    home: 'M3.5 10.2L12 3.5l8.5 6.7M5.5 8.7V19a1.5 1.5 0 001.5 1.5h3.2v-5.2a1.8 1.8 0 013.6 0v5.2H17a1.5 1.5 0 001.5-1.5V8.7',
    tours: 'M5 7.5h14a2 2 0 012 2v8.5a2 2 0 01-2 2H5a2 2 0 01-2-2V9.5a2 2 0 012-2zM8.5 7.5V6a2 2 0 012-2h3a2 2 0 012 2v1.5M3 12.5h18M10.5 12.5v1.5h3v-1.5',
    mates: 'M9 11.5a3.25 3.25 0 100-6.5 3.25 3.25 0 000 6.5zM3 19.5c.4-3.2 2.9-5.5 6-5.5s5.6 2.3 6 5.5M15.5 5.2a3.25 3.25 0 010 6.1M17.5 14.4c1.9.7 3.2 2.6 3.5 5.1',
    review: 'M12 3.8c4.6 0 8.2 3.3 8.2 7.4s-3.6 7.4-8.2 7.4c-1 0-2-.2-2.9-.5L4.5 20l1.3-3.6C4.6 15 3.8 13.2 3.8 11.2c0-4.1 3.6-7.4 8.2-7.4zM12 7.8l1.1 2.2 2.4.4-1.75 1.7.4 2.4-2.15-1.1-2.15 1.1.4-2.4-1.75-1.7 2.4-.4z',
    my: 'M12 11.5a4 4 0 100-8 4 4 0 000 8zM4.5 20.5c.6-3.9 3.7-6.5 7.5-6.5s6.9 2.6 7.5 6.5',
};

export const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const items: NavItem[] = [
        { path: '/', label: t('nav.home'), d: ICON.home, match: (p) => p === '/' },
        { path: '/products', label: t('nav.products'), d: ICON.tours, match: (p) => p === '/products' || p.startsWith('/category/') },
        { path: '/travel-mates', label: t('nav.travel_mates'), d: ICON.mates, match: (p) => p.startsWith('/travel-mates') },
        { path: '/reviews', label: t('nav.reviews'), d: ICON.review, match: (p) => p.startsWith('/reviews') },
        { path: '/mypage', label: t('nav.my_page'), d: ICON.my, match: (p) => p.startsWith('/mypage') },
    ];

    return (
        <nav
            aria-label="タブメニュー"
            style={{
                position: 'fixed',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                maxWidth: 480,
                zIndex: 50,
                boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(10px)',
                borderTop: `1px solid ${MW.line}`,
                display: 'grid',
                gridTemplateColumns: 'repeat(5,1fr)',
                padding: '6px 4px calc(8px + env(safe-area-inset-bottom))',
                fontFamily: MW_FONT,
            }}
        >
            {items.map((item) => {
                const active = item.match(location.pathname);
                const fg = active ? MW.mintDeep : '#6B7A84';
                return (
                    <button
                        key={item.path}
                        type="button"
                        onClick={() => navigate(item.path)}
                        aria-current={active ? 'page' : undefined}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, height: 52, border: 0, background: 'transparent', padding: 0, fontFamily: 'inherit', fontSize: 10, fontWeight: active ? 700 : 500, color: fg, cursor: 'pointer' }}
                    >
                        <span style={{ width: 52, height: 30, borderRadius: 999, background: active ? MW.mintTint : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d={item.d} />
                            </svg>
                        </span>
                        {item.label}
                    </button>
                );
            })}
        </nav>
    );
};
