import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logoSquare from '../../assets/new_logo_2026.png';
import { MatIcon } from '../desktop-primitives/MatIcon';

interface DesktopHeaderProps {
    contentWidth?: number;
}

const NAV_ITEMS: { id: string; label: string; path: string; match?: (p: string) => boolean }[] = [
    { id: 'home', label: 'ホーム', path: '/', match: (p) => p === '/' },
    { id: 'tours', label: 'ツアー商品', path: '/products', match: (p) => p === '/products' || p.startsWith('/category/') || p.startsWith('/products/') },
    { id: 'mates', label: '同行者募集', path: '/travel-mates', match: (p) => p.startsWith('/travel-mates') },
    { id: 'reviews', label: 'レビュー', path: '/reviews', match: (p) => p.startsWith('/reviews') },
    { id: 'magazine', label: '旅マガジン', path: '/travel-guide', match: (p) => p.startsWith('/travel-guide') },
    { id: 'quote', label: 'お見積もり', path: '/custom-estimate', match: (p) => p.startsWith('/custom-estimate') || p.startsWith('/estimate') },
];

export function DesktopHeader({ contentWidth = 1280 }: DesktopHeaderProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    useEffect(() => {
        const onS = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', onS);
        onS();
        return () => window.removeEventListener('scroll', onS);
    }, []);

    const onSearch = (e: FormEvent) => {
        e.preventDefault();
        const q = searchValue.trim();
        navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
    };

    const onConsult = () => {
        if (typeof window.openChannelTalk === 'function') {
            window.openChannelTalk();
        } else {
            navigate('/custom-estimate');
        }
    };

    return (
        <header
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                background: 'rgba(255,255,255,0.96)',
                backdropFilter: 'blur(12px)',
                borderBottom: scrolled ? '1px solid var(--border-subtle)' : '1px solid transparent',
                transition: 'border-color 200ms',
            }}
        >
            {/* Top utility bar */}
            <div style={{ background: 'var(--fg-1)', color: '#cbd5e1', fontSize: 12 }}>
                <div
                    style={{
                        maxWidth: contentWidth,
                        margin: '0 auto',
                        padding: '8px 32px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#5eead4' }}>
                            <MatIcon name="verified" size={14} filled color="#5eead4" /> 日本語完全対応・現地旅行社
                        </span>
                        <span style={{ opacity: 0.4 }}>|</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <MatIcon name="schedule" size={14} color="#cbd5e1" /> 平日 9:00–18:00 (JST)
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button type="button" onClick={() => navigate('/login')} style={utilLinkBtn}>
                            ログイン
                        </button>
                        <button type="button" onClick={() => navigate('/login')} style={utilLinkBtn}>
                            新規登録
                        </button>
                    </div>
                </div>
            </div>

            {/* Main header */}
            <div
                style={{
                    maxWidth: contentWidth,
                    margin: '0 auto',
                    padding: '18px 32px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 32,
                }}
            >
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                    <img src={logoSquare} alt="Milkyway Japan" style={{ height: 48, width: 48, objectFit: 'contain' }} />
                    <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.01em' }}>Milkyway Japan</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-5)', marginTop: 2 }}>モンゴル旅行・モンゴルツアー専門</div>
                    </div>
                </button>

                {/* Search */}
                <form
                    onSubmit={onSearch}
                    style={{
                        flex: 1,
                        maxWidth: 520,
                        marginLeft: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'var(--bg-muted)',
                        borderRadius: 999,
                        padding: '6px 6px 6px 18px',
                        border: '1px solid transparent',
                        transition: 'all 150ms',
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.background = '#fff';
                        e.currentTarget.style.borderColor = 'var(--primary-ring)';
                        e.currentTarget.style.boxShadow = '0 0 0 4px var(--primary-tint)';
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.background = 'var(--bg-muted)';
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    <MatIcon name="search" size={20} color="var(--fg-5)" />
                    <input
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder="行きたいツアー・地域・テーマで検索 (例: ゴビ砂漠、乗馬…)"
                        style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            fontSize: 14,
                            color: 'var(--fg-1)',
                            fontFamily: 'inherit',
                        }}
                    />
                    <button
                        type="submit"
                        style={{
                            background: '#0f766e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 999,
                            padding: '9px 18px',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        検索
                    </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button type="button" onClick={() => navigate('/mypage/wishlist')} style={iconBtn} title="お気に入り">
                        <MatIcon name="favorite" size={20} color="var(--fg-3)" />
                    </button>
                    <button type="button" onClick={() => navigate('/mypage/notifications')} style={iconBtn} title="通知">
                        <MatIcon name="notifications" size={20} color="var(--fg-3)" />
                    </button>
                    <button
                        type="button"
                        onClick={onConsult}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 18px',
                            background: '#0f766e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            boxShadow: '0 6px 18px -6px rgba(15,118,110,0.45)',
                        }}
                    >
                        <MatIcon name="chat_bubble" size={16} filled color="#fff" /> 無料相談
                    </button>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div
                    style={{
                        maxWidth: contentWidth,
                        margin: '0 auto',
                        padding: '0 32px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    {NAV_ITEMS.map((it) => {
                        const on = it.match ? it.match(location.pathname) : location.pathname === it.path;
                        return (
                            <button
                                key={it.id}
                                type="button"
                                onClick={() => navigate(it.path)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '16px 18px',
                                    fontSize: 14,
                                    fontWeight: on ? 700 : 500,
                                    color: on ? 'var(--fg-1)' : 'var(--fg-3)',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    fontFamily: 'inherit',
                                }}
                            >
                                {it.label}
                                {on && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            bottom: -1,
                                            left: 18,
                                            right: 18,
                                            height: 2,
                                            background: '#0f766e',
                                        }}
                                    />
                                )}
                            </button>
                        );
                    })}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20, fontSize: 13, color: 'var(--fg-4)' }}>
                        <a
                            href="tel:+97695945838"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                        >
                            <MatIcon name="phone" size={16} color="#0f766e" />
                            <span style={{ fontWeight: 700, color: 'var(--fg-1)' }}>+976 9594 5838</span>
                        </a>
                    </div>
                </div>
            </nav>
        </header>
    );
}

const iconBtn: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 999,
    border: '1px solid var(--border-subtle)',
    background: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const utilLinkBtn: CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#cbd5e1',
    cursor: 'pointer',
    padding: 0,
    fontSize: 12,
    fontFamily: 'inherit',
};
