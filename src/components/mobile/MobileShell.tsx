import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import logoSquare from '../../assets/new_logo_2026.png';
import { api } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import { MW, MW_FONT, MW_FONT_EN, isUsableImage, yen } from '../desktop-primitives/mwTokens';
import { useMe } from '../mypage-desktop/useMyPageData';
import { MobileShellContext } from './mobileShellContext';
import { MobileTabBar } from './MobileTabBar';
import { D, LINE_CHAT_URL, M_GRADIENT, M_HAIR, M_TILE, QUICK_MENU } from './mobileTheme';
import { Ico, QuickMenuBadge, TravellerAvatar } from './mobileUi';

/**
 * Mobile app shell (Claude Design: "Milkyway Japan Mobile").
 * Sticky header with search, optional back bar, page content, footer, and the bottom tab bar
 * (or a page-specific action bar). The home screen also gets the always-open search box and
 * the horizontal menu row.
 */
interface MobileShellProps {
    children: ReactNode;
    /** Home screen: search box always visible + menu row under it. */
    home?: boolean;
    /** Back bar title. Omit on screens that render their own title bar (SubPageBar). */
    title?: string;
    onBack?: () => void;
    /** Replaces the tab bar (quote form, mate detail). */
    bottomBar?: ReactNode;
    tabBar?: boolean;
    footer?: boolean;
}

const HOT_WORDS = ['ゴビ砂漠', '乗馬', '星空', '温泉'];
const POPULAR_WORDS = ['ゴビ砂漠', '乗馬', '星空', '温泉', 'トレッキング'];
const RECENT_KEY = 'mw_recent_searches';
/** Kana / romaji typos mapped to the word tours are actually tagged with. */
const FIXES: Record<string, string> = {
    'ゴビさばく': 'ゴビ砂漠', 'ごび': 'ゴビ', 'ゴビ砂莫': 'ゴビ砂漠', 'じょうば': '乗馬', 'ほしぞら': '星空', 'おんせん': '温泉',
    'らくだ': 'ラクダ', 'てれるじ': 'テレルジ', 'とれっきんぐ': 'トレッキング', gobi: 'ゴビ砂漠',
};
const BACK_BAR_H = 49;

const NAV_ROW: { label: string; path: string; match: (p: string) => boolean; dot?: boolean }[] = [
    { label: 'ホーム', path: '/', match: (p) => p === '/' },
    { label: 'ツアー商品', path: '/products', match: (p) => p.startsWith('/products') || p.startsWith('/category/') },
    { label: '同行者募集', path: '/travel-mates', match: (p) => p.startsWith('/travel-mates') },
    { label: 'レビュー', path: '/reviews', match: (p) => p.startsWith('/reviews') },
    { label: '旅マガジン', path: '/travel-guide', match: (p) => p.startsWith('/travel-guide') },
    { label: 'お見積もり', path: '/custom-estimate', match: (p) => p.startsWith('/custom-estimate') },
    { label: '旅行企画展', path: '/promotions', match: (p) => p.startsWith('/promotions'), dot: true },
];

const FOOT_GROUPS: { title: string; links: { label: string; path?: string; line?: boolean }[] }[] = [
    {
        title: 'サービス',
        links: [
            { label: 'モンゴル旅行ガイド', path: '/travel-guide' },
            { label: 'モンゴルツアー商品一覧', path: '/products' },
            { label: 'モンゴル乗馬旅行', path: '/category/horse-riding-tour' },
            { label: 'ゴビ砂漠ツアー', path: '/category/gobi-desert' },
            { label: '同行者を探す', path: '/travel-mates' },
            { label: 'お見積もりリクエスト', path: '/custom-estimate' },
        ],
    },
    {
        title: 'ご利用案内',
        links: [
            { label: 'ご予約の流れ', path: '/about' },
            { label: 'よくある質問 (FAQ)', path: '/faq' },
            { label: '利用規約', path: '/terms-of-service' },
            { label: 'プライバシーポリシー', path: '/privacy-policy' },
            { label: 'ご予約状況の確認', path: '/reservation-status' },
        ],
    },
    {
        title: '会社情報',
        links: [
            { label: '会社案内', path: '/about' },
            { label: 'ガイド募集', path: '/guide-apply' },
            { label: 'お客様のレビュー', path: '/reviews' },
            { label: 'マイページ', path: '/mypage' },
            { label: 'お問い合わせ', path: '/contact' },
        ],
    },
];

interface SearchProduct {
    id: string;
    name: string;
    category: string;
    duration: string;
    price: number;
    tags: string[];
    image: string;
}

const readRecent = (): string[] => {
    try {
        const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
        return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 6) : [];
    } catch {
        return [];
    }
};

const writeRecent = (list: string[]) => {
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch {
        /* storage unavailable — recent searches are a convenience only */
    }
};

const tokens = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);

export function MobileShell({ children, home = false, title, onBack, bottomBar, tabBar = true, footer = true }: MobileShellProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const path = location.pathname;
    const queryClient = useQueryClient();
    const { unreadCount } = useNotification();
    const { data: me } = useMe();
    const logged = !!me;

    const hdrRef = useRef<HTMLElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const [hdrH, setHdrH] = useState(64);
    const [menuOpen, setMenuOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);
    const [text, setText] = useState('');
    const [recent, setRecent] = useState<string[]>(readRecent);
    const [hotIdx, setHotIdx] = useState(0);
    const [foot, setFoot] = useState<number | null>(null);

    const showSearch = home || expanded;

    // The header changes height between the home screen and sub screens; sticky bars follow it.
    useLayoutEffect(() => {
        const el = hdrRef.current;
        if (!el) return;
        const measure = () => setHdrH(Math.round(el.getBoundingClientRect().height));
        measure();
        if (!window.ResizeObserver) return;
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const t = window.setInterval(() => setHotIdx((i) => i + 1), 3000);
        return () => window.clearInterval(t);
    }, []);

    // Tapping anywhere outside the search box closes its panel.
    useEffect(() => {
        if (!panelOpen) return;
        const onDown = (e: PointerEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setPanelOpen(false);
        };
        document.addEventListener('pointerdown', onDown);
        return () => document.removeEventListener('pointerdown', onDown);
    }, [panelOpen]);

    useEffect(() => {
        if (!menuOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [menuOpen]);

    // Search suggestions only load once the user opens the search box.
    const { data: products = [] } = useQuery<SearchProduct[]>({
        queryKey: ['headerSearch', 'products'],
        enabled: panelOpen,
        staleTime: 1000 * 60 * 5,
        queryFn: async () => {
            const data = await api.products.list();
            if (!Array.isArray(data)) return [];
            return data
                .filter((p: { status?: string }) => p.status === 'active' || !p.status)
                .map((p: { id: string; name: string; category?: string; duration?: string; price?: number; tags?: string[]; mainImages?: string[] }) => ({
                    id: p.id,
                    name: (p.name || '').trim(),
                    category: p.category || '',
                    duration: p.duration || '',
                    price: p.price || 0,
                    tags: Array.isArray(p.tags) ? p.tags : [],
                    image: p.mainImages?.[0] || '',
                }));
        },
    });

    const q = text.trim();
    const fix = FIXES[q.toLowerCase()] || '';
    const results = useMemo(() => {
        const toks = tokens(fix || q);
        return toks.length ? products.filter((p) => toks.every((k) => `${p.name} ${p.category} ${p.duration} ${p.tags.join(' ')}`.toLowerCase().includes(k))) : [];
    }, [products, q, fix]);
    const hot = HOT_WORDS[hotIdx % HOT_WORDS.length];

    const go = (to: string) => {
        setMenuOpen(false);
        setPanelOpen(false);
        setExpanded(false);
        navigate(to);
        window.scrollTo(0, 0);
    };

    const runSearch = (raw: string) => {
        const word = raw.trim();
        if (!word) return;
        const next = [word, ...recent.filter((x) => x !== word)].slice(0, 6);
        setRecent(next);
        writeRecent(next);
        setText(word);
        go(`/products?q=${encodeURIComponent(word)}`);
    };

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        runSearch(fix || text);
    };

    const goBack = () => {
        if (onBack) onBack();
        else if (window.history.length > 1) navigate(-1);
        else go('/');
    };

    const logout = async () => {
        try {
            await api.auth.logout();
        } catch {
            // ignore
        }
        queryClient.removeQueries({ queryKey: ['authMe'] });
        queryClient.removeQueries({ queryKey: ['myPage'] });
        queryClient.removeQueries({ queryKey: ['wishlistIds'] });
        go('/');
    };

    const noticeOn = path === '/mypage/notifications';
    const stickyTop = hdrH - 1 + (title !== undefined ? BACK_BAR_H : 0);
    const shell = useMemo(() => ({ stickyTop }), [stickyTop]);
    const avatar = me?.avatarUrl || me?.image;

    return (
        <MobileShellContext.Provider value={shell}>
            <div data-mw-actionbar={bottomBar ? '' : undefined} style={{ position: 'relative', minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', color: MW.navy, fontFamily: MW_FONT, WebkitFontSmoothing: 'antialiased' }}>
                <header ref={hdrRef} style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${M_HAIR}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
                        <a
                            href="/"
                            onClick={(e) => { e.preventDefault(); go('/'); }}
                            aria-label="Milkyway Japan ホーム"
                            style={{ display: 'flex', alignItems: 'center', gap: 8, color: MW.navy, flex: 1, minWidth: 0, textDecoration: 'none' }}
                        >
                            <img src={logoSquare} alt="" width={34} height={34} style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }} />
                            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0 }}>
                                <span style={{ fontFamily: MW_FONT_EN, fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                                    Milkyway<span style={{ color: MW.mint }}> Japan</span>
                                </span>
                                <span style={{ fontSize: 10, color: MW.mute, whiteSpace: 'nowrap' }}>モンゴル旅行・モンゴルツアー専門</span>
                            </span>
                        </a>
                        {!home && (
                            <button
                                type="button"
                                onClick={() => { setPanelOpen(!expanded); setExpanded(!expanded); }}
                                aria-label="検索"
                                aria-expanded={expanded}
                                style={{ width: 44, height: 44, border: 0, borderRadius: '50%', background: expanded ? MW.mintTint : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginRight: -6, padding: 0 }}
                            >
                                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={MW.navy} strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => { if (!noticeOn) go('/mypage/notifications'); }}
                            aria-label="お知らせ"
                            style={{ position: 'relative', width: 44, height: 44, border: 0, borderRadius: '50%', background: noticeOn ? MW.mintTint : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                        >
                            <Ico d={D.bell} size={23} width={1.7} />
                            {unreadCount > 0 && (
                                <span style={{ position: 'absolute', top: 7, right: 7, minWidth: 16, height: 16, padding: '0 4px', boxSizing: 'border-box', borderRadius: 999, background: MW.mint, border: '2px solid #FFFFFF', color: MW.navy, fontFamily: MW_FONT_EN, fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>
                        <button type="button" onClick={() => setMenuOpen(true)} aria-label="全体メニュー" style={{ width: 44, height: 44, border: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginRight: -8, padding: 0 }}>
                            <Ico d={D.menu} size={22} />
                        </button>
                    </div>

                    {showSearch && (
                        <div ref={searchRef} style={{ position: 'relative', padding: '0 16px 10px' }}>
                            <form
                                onSubmit={onSubmit}
                                role="search"
                                style={{ display: 'flex', alignItems: 'center', gap: 10, height: 46, padding: '0 6px 0 16px', border: `1.5px solid ${panelOpen ? MW.mint : MW.navy}`, borderRadius: 999, background: '#fff', boxShadow: panelOpen ? '0 0 0 4px rgba(39,171,143,0.15)' : 'none', transition: 'box-shadow .2s,border-color .2s', boxSizing: 'border-box' }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MW.navy} strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
                                <input
                                    value={text}
                                    onChange={(e) => { setText(e.target.value); setPanelOpen(true); }}
                                    onFocus={() => setPanelOpen(true)}
                                    autoFocus={!home}
                                    enterKeyHint="search"
                                    placeholder="ゴビ砂漠、乗馬、星空ツアーを検索"
                                    aria-label="ツアーを検索"
                                    style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 16, color: MW.navy, padding: 0, boxShadow: 'none' }}
                                />
                                {!!q && (
                                    <button type="button" onClick={() => setText('')} aria-label="クリア" style={{ width: 32, height: 32, border: 0, borderRadius: '50%', background: MW.chip, color: MW.mute, fontSize: 14, cursor: 'pointer', flexShrink: 0, padding: 0 }}>×</button>
                                )}
                                {!q && !panelOpen && (
                                    <button type="button" onClick={() => runSearch(hot)} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, height: 34, padding: '0 10px', border: 0, borderRadius: 999, background: 'transparent', fontFamily: 'inherit', cursor: 'pointer' }}>
                                        <span style={{ fontFamily: MW_FONT_EN, fontSize: 9, fontWeight: 700, color: MW.mintDeep, border: `1.5px solid ${MW.mint}`, borderRadius: 6, padding: '2px 5px' }}>HOT</span>
                                        <span style={{ fontSize: 12, color: MW.ink3, minWidth: 48, textAlign: 'left' }}>{hot}</span>
                                    </button>
                                )}
                            </form>

                            {panelOpen && (
                                <div style={{ position: 'absolute', left: 16, right: 16, top: 52, zIndex: 25, background: '#FFFFFF', border: `1px solid ${MW.line}`, borderRadius: 20, boxShadow: '0 16px 40px rgba(10,31,46,0.14)', padding: '14px 0 8px', maxHeight: '70vh', overflowY: 'auto' }}>
                                    {!q && (
                                        <>
                                            {recent.length > 0 && (
                                                <>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 8px' }}>
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: MW.mute }}>最近の検索</span>
                                                        <button type="button" onClick={() => { setRecent([]); writeRecent([]); }} style={{ border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 12, color: MW.mute2, cursor: 'pointer' }}>すべて削除</button>
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 16px 14px' }}>
                                                        {recent.map((r) => (
                                                            <button key={r} type="button" onClick={() => runSearch(r)} style={{ height: 32, padding: '0 12px', border: `1px solid ${MW.line}`, borderRadius: 999, background: '#fff', fontFamily: 'inherit', fontSize: 12, color: MW.ink3, cursor: 'pointer' }}>{r}</button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                            <span style={{ display: 'block', padding: '0 16px 8px', fontSize: 12, fontWeight: 700, color: MW.mute }}>人気の検索ワード</span>
                                            {POPULAR_WORDS.map((w, i) => (
                                                <button key={w} type="button" onClick={() => runSearch(w)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, height: 44, padding: '0 16px', border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 14, color: MW.navy, cursor: 'pointer', textAlign: 'left' }}>
                                                    <span style={{ width: 18, fontFamily: MW_FONT_EN, fontSize: 12, fontWeight: 600, color: i < 3 ? MW.mintDeep : MW.mute2 }}>{i + 1}</span>
                                                    {w}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                    {!!q && (
                                        <>
                                            {!!fix && (
                                                <button type="button" onClick={() => setText(fix)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px 10px', border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 13, color: MW.mute, cursor: 'pointer', textAlign: 'left' }}>
                                                    もしかして：<strong style={{ color: MW.mintDeep }}>{fix}</strong>
                                                </button>
                                            )}
                                            {results.slice(0, 5).map((t) => (
                                                <button key={t.id} type="button" onClick={() => go(`/products/${t.id}`)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', border: 0, background: 'transparent', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
                                                    <span style={{ width: 48, height: 48, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: MW.chip }}>
                                                        {isUsableImage(t.image) && <img src={t.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                                                    </span>
                                                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                        <span style={{ fontSize: 14, fontWeight: 700, color: MW.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                                                        <span style={{ fontSize: 12, color: MW.mute }}>{[t.duration, t.price > 0 ? `${yen(t.price)}〜` : ''].filter(Boolean).join('・')}</span>
                                                    </span>
                                                </button>
                                            ))}
                                            {results.length === 0 && (
                                                <span style={{ display: 'block', padding: '12px 16px 16px', fontSize: 13, color: MW.mute }}>「{q}」に一致するツアーは見つかりませんでした。</span>
                                            )}
                                            {results.length > 0 && (
                                                <button type="button" onClick={() => runSearch(fix || text)} style={{ width: 'calc(100% - 32px)', margin: '8px 16px 6px', height: 44, border: 0, borderRadius: 999, background: MW.navy, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}>
                                                    「{q}」の検索結果 {results.length}件をすべて見る
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {home && (
                        <nav data-noscroll="" aria-label="メニュー" style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 10px' }}>
                            {NAV_ROW.map((n) => {
                                const on = n.match(path);
                                return (
                                    <a
                                        key={n.path}
                                        href={n.path}
                                        onClick={(e) => { e.preventDefault(); go(n.path); }}
                                        style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, height: 42, padding: '0 10px', fontSize: 14, fontWeight: on ? 900 : 500, color: on ? MW.navy : MW.ink3, whiteSpace: 'nowrap', borderBottom: `2px solid ${on ? MW.navy : 'transparent'}`, boxSizing: 'border-box', textDecoration: 'none' }}
                                    >
                                        {n.label}
                                        {n.dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: MW.mint }} />}
                                    </a>
                                );
                            })}
                        </nav>
                    )}
                </header>

                {title !== undefined && (
                    <div style={{ position: 'sticky', top: hdrH - 1, zIndex: 10, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${M_HAIR}`, display: 'grid', gridTemplateColumns: '44px minmax(0,1fr) 44px', alignItems: 'center', padding: '2px 6px' }}>
                        <button type="button" onClick={goBack} aria-label="戻る" style={{ width: 44, height: 44, border: 0, borderRadius: '50%', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                            <Ico d={D.back} size={22} width={2} />
                        </button>
                        <span style={{ textAlign: 'center', fontSize: 15, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
                        <span />
                    </div>
                )}

                <main style={{ flex: 1, minWidth: 0 }}>{children}</main>

                {footer && (
                    <footer style={{ marginTop: 48, borderTop: `1px solid ${MW.line}`, padding: '28px 16px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <span style={{ fontFamily: MW_FONT_EN, fontWeight: 700, fontSize: 18 }}>Milkyway<span style={{ color: MW.mint }}> Japan</span></span>
                            <span style={{ fontSize: 11, color: MW.mute }}>Mongolia Milky Way (SUUN ZAM)</span>
                            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.8, color: MW.mute }}>モンゴル旅行・モンゴルツアー専門の現地旅行社です。日本語堪能な専門ガイドが同行し、安心・安全なご旅行をご提案します。</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', borderTop: `1px solid ${M_HAIR}` }}>
                            {FOOT_GROUPS.map((g, i) => {
                                const open = foot === i;
                                return (
                                    <div key={g.title} style={{ borderBottom: `1px solid ${M_HAIR}` }}>
                                        <button type="button" onClick={() => setFoot(open ? null : i)} aria-expanded={open} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 52, padding: 0, border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: MW.navy, cursor: 'pointer' }}>
                                            {g.title}
                                            <span style={{ fontSize: 14, color: MW.mute, transform: `rotate(${open ? 180 : 0}deg)`, transition: 'transform .2s' }}>⌄</span>
                                        </button>
                                        {open && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '12px 16px', padding: '0 0 18px' }}>
                                                {g.links.map((l) => (
                                                    <a key={l.label} href={l.path} onClick={(e) => { e.preventDefault(); if (l.path) go(l.path); }} style={{ fontSize: 13, color: MW.mute, textDecoration: 'none' }}>{l.label}</a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 11, lineHeight: 1.8, color: MW.mute }}>
                            <div>
                                <strong style={{ color: MW.navy }}>[モンゴル本社]</strong><br />
                                商号: Mongolia Milky Way (SUUN ZAM) | 代表者: Davaasuren Bilguun<br />
                                事業者登録番号: 9011640064 | 観光事業登録番号: 6124313<br />
                                電話: +976 9594 5838 | Tel: +976-8010-7766<br />
                                所在地: ウランバートル バヤンズルフ区 13棟 DACOセンター 3階 306
                            </div>
                            <div>
                                <strong style={{ color: MW.navy }}>[韓国代理店]</strong><br />
                                商号: Hello Bolor | 代表者: Davaasuren Bolor<br />
                                事業者登録番号: 730-54-00614 | 通信販売業番号: 第2022-ソウル中浪-1776号<br />
                                メール: bolor1@hanmail.net<br />
                                お問い合わせ: 公式LINE またはチャットでお問い合わせください。
                            </div>
                        </div>
                    </footer>
                )}

                {bottomBar}

                {!bottomBar && tabBar && <MobileTabBar />}

                {menuOpen && (
                    <div role="dialog" aria-modal="true" aria-label="全体メニュー" data-mw-overlay="" style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', justifyContent: 'center' }}>
                        <div onClick={() => setMenuOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(10,31,46,0.45)' }} />
                        <div style={{ position: 'relative', width: '100%', maxWidth: 480, height: '100%', display: 'flex', justifyContent: 'flex-end', pointerEvents: 'none' }}>
                            <div style={{ position: 'relative', width: '84%', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto', pointerEvents: 'auto', fontFamily: MW_FONT, color: MW.navy }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${M_HAIR}` }}>
                                    <span style={{ fontSize: 15, fontWeight: 900 }}>全体メニュー</span>
                                    <button type="button" onClick={() => setMenuOpen(false)} aria-label="閉じる" style={{ width: 44, height: 44, border: 0, background: 'transparent', fontSize: 22, color: MW.navy, cursor: 'pointer', marginRight: -10, padding: 0 }}>×</button>
                                </div>

                                <div style={{ margin: 16, padding: 16, borderRadius: 18, background: 'linear-gradient(135deg,#F1FCF8 0%,#E3F8F1 100%)', border: `1px solid ${MW.mintTint}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {logged ? (
                                        <>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                                <span style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: MW.mintTint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <TravellerAvatar size={40} />}
                                                </span>
                                                <span style={{ fontSize: 14, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(me?.name || me?.email?.split('@')[0] || 'お客様')} 様</span>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                                                <a href="/mypage" onClick={(e) => { e.preventDefault(); go('/mypage'); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 999, background: M_GRADIENT, fontSize: 14, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', textDecoration: 'none' }}>マイページ</a>
                                                <button type="button" onClick={logout} style={{ height: 46, borderRadius: 999, background: '#FFFFFF', border: `1.5px solid ${MW.navy}`, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: MW.navy, whiteSpace: 'nowrap', cursor: 'pointer' }}>ログアウト</button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.5, color: MW.navy, whiteSpace: 'nowrap' }}>ログインして予約・見積もりを管理</span>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                                                <a href="/login" onClick={(e) => { e.preventDefault(); go('/login'); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 999, background: '#FFFFFF', border: `1.5px solid ${MW.navy}`, fontSize: 14, fontWeight: 700, color: MW.navy, whiteSpace: 'nowrap', textDecoration: 'none', boxSizing: 'border-box' }}>
                                                    <Ico d="M10 17l5-5-5-5M15 12H3M14 4h5a1 1 0 011 1v14a1 1 0 01-1 1h-5" size={16} width={2} />ログイン
                                                </a>
                                                <a href="/login" onClick={(e) => { e.preventDefault(); go('/login'); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 999, background: M_GRADIENT, fontSize: 14, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', textDecoration: 'none' }}>
                                                    <Ico d="M10 11a4 4 0 100-8 4 4 0 000 8zM3 20c.7-3.4 3.6-6 7-6 1.4 0 2.7.4 3.8 1.1M18 14v6M15 17h6" size={16} width={2} color="#FFFFFF" />新規登録
                                                </a>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div style={{ padding: '4px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <span style={{ fontFamily: MW_FONT_EN, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: MW.mintDeep, padding: '0 4px' }}>MENU</span>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
                                        {QUICK_MENU.map((item) => (
                                            <a key={item.key} href={item.path} onClick={(e) => { e.preventDefault(); go(item.path); }} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 4px 12px', borderRadius: 16, background: M_TILE, color: MW.navy, minWidth: 0, textDecoration: 'none' }}>
                                                <span style={{ width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <img src={item.icon} alt="" width={46} height={46} style={{ width: 46, height: 46, objectFit: 'contain' }} />
                                                </span>
                                                <span style={{ maxWidth: '100%', fontSize: 12, fontWeight: 700, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                                                <QuickMenuBadge item={item} />
                                            </a>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ padding: '24px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <span style={{ fontFamily: MW_FONT_EN, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: MW.mintDeep, padding: '0 4px' }}>SUPPORT</span>
                                    <div style={{ border: `1px solid ${MW.line}`, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                        {([['お知らせ', 'M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 20a2 2 0 004 0', '/mypage/notifications'], ['よくある質問', D.faq, '/faq'], ['お問い合わせ', D.mail, '/contact']] as const).map(([label, d, to], i) => (
                                            <a key={to} href={to} onClick={(e) => { e.preventDefault(); go(to); }} style={{ display: 'flex', alignItems: 'center', gap: 12, height: 52, padding: '0 14px', borderTop: `1px solid ${i ? M_HAIR : 'transparent'}`, color: MW.navy, textDecoration: 'none' }}>
                                                <span style={{ width: 32, height: 32, borderRadius: 10, background: MW.mintBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Ico d={d} size={17} color={MW.mintDeep} />
                                                </span>
                                                <span style={{ flex: 1, fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
                                                <Ico d={D.chevron} size={16} color={MW.mute2} width={2} />
                                            </a>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ margin: '24px 16px 24px', padding: 16, borderRadius: 18, background: MW.navySoft, color: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ fontSize: 14, fontWeight: 900, whiteSpace: 'nowrap' }}>日本語完全対応・現地旅行社</span>
                                        <span style={{ fontSize: 11, color: '#C4D0D8', whiteSpace: 'nowrap' }}>LINE相談 平均3時間以内にご返信</span>
                                    </div>
                                    <a href={LINE_CHAT_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 999, background: '#06C755', fontSize: 14, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', textDecoration: 'none' }}>
                                        <span style={{ fontFamily: MW_FONT_EN, fontSize: 10, fontWeight: 700, background: '#FFFFFF', color: '#06C755', padding: '2px 6px', borderRadius: 5 }}>LINE</span>LINEで相談する
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MobileShellContext.Provider>
    );
}
