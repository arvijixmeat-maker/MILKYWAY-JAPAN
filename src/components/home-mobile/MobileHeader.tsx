import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import logoSquare from '../../assets/new_logo_2026.png';
import { api } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import { HOT_WORDS, SITE_NAV, productMatches, pushRecent, readRecent, searchTokens, useSearchProducts, writeRecent } from '../../hooks/useTourSearch';
import { MW, MW_FONT, MW_FONT_EN, isUsableImage, yen } from '../desktop-primitives/mwTokens';

const POPULAR = [...HOT_WORDS, 'トレッキング'];

// Common kana / typo spellings → the word the tours actually use.
const FIXES: Record<string, string> = {
    'ゴビさばく': 'ゴビ砂漠', 'ごび': 'ゴビ', 'ゴビ砂莫': 'ゴビ砂漠', 'じょうば': '乗馬', 'ほしぞら': '星空',
    'おんせん': '温泉', 'らくだ': 'ラクダ', 'てれるじ': 'テレルジ', 'とれっきんぐ': 'トレッキング', 'gobi': 'ゴビ砂漠',
};

/** Mobile site header: logo, notifications, menu, tour search and section nav. */
export function MobileHeader() {
    const navigate = useNavigate();
    const location = useLocation();
    const { unreadCount } = useNotification();
    const boxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [text, setText] = useState('');
    const [open, setOpen] = useState(false);
    const [recent, setRecent] = useState<string[]>(readRecent);
    const [hotIdx, setHotIdx] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const t = window.setInterval(() => setHotIdx((i) => i + 1), 3000);
        return () => window.clearInterval(t);
    }, []);

    // Close the suggestion panel on an outside tap (navigation handlers close it themselves).
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('pointerdown', onDown);
        return () => document.removeEventListener('pointerdown', onDown);
    }, [open]);

    const products = useSearchProducts(open);
    const q = text.trim();
    const fix = FIXES[q.toLowerCase()] || '';
    const words = searchTokens(fix || q);
    const results = words.length ? products.filter((p) => productMatches(p, words)) : [];
    const hot = HOT_WORDS[hotIdx % HOT_WORDS.length];

    const search = (raw: string) => {
        const word = raw.trim();
        if (!word) return;
        setRecent(pushRecent(recent, word));
        setText(word);
        setOpen(false);
        inputRef.current?.blur();
        navigate(`/products?q=${encodeURIComponent(word)}`);
    };
    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        search(fix || text);
    };

    return (
        <>
            <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #EEF1EF', fontFamily: MW_FONT, color: MW.navy }}>
                <div style={{ maxWidth: 480, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
                        <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} aria-label="Milkyway Japan ホーム" style={{ display: 'flex', alignItems: 'center', gap: 8, color: MW.navy, flex: 1, minWidth: 0, textDecoration: 'none' }}>
                            <img src={logoSquare} alt="" width={34} height={34} style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }} />
                            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0 }}>
                                <span style={{ fontFamily: MW_FONT_EN, fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                                    Milkyway<span style={{ color: MW.mint }}> Japan</span>
                                </span>
                                <span style={{ fontSize: 10, color: MW.mute, whiteSpace: 'nowrap' }}>モンゴル旅行・モンゴルツアー専門</span>
                            </span>
                        </a>
                        <button type="button" onClick={() => navigate('/mypage/notifications')} aria-label={unreadCount ? `お知らせ（未読${unreadCount}件）` : 'お知らせ'} style={iconBtn}>
                            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={MW.navy} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 2h-15zM10 20.5a2 2 0 004 0" />
                            </svg>
                            {unreadCount > 0 && (
                                <span style={{ position: 'absolute', top: 7, right: 7, minWidth: 16, height: 16, padding: '0 4px', boxSizing: 'border-box', borderRadius: 999, background: MW.mint, border: '2px solid #FFFFFF', color: MW.navy, fontFamily: MW_FONT_EN, fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>
                        <button type="button" onClick={() => setMenuOpen(true)} aria-label="全体メニュー" aria-expanded={menuOpen} style={{ ...iconBtn, marginRight: -8 }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={MW.navy} strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                                <path d="M4 7h16M4 12h16M4 17h16" />
                            </svg>
                        </button>
                    </div>

                    <div ref={boxRef} style={{ position: 'relative', padding: '0 16px 10px' }}>
                        <form onSubmit={onSubmit} role="search" style={{ display: 'flex', alignItems: 'center', gap: 10, height: 46, padding: '0 6px 0 16px', border: `1.5px solid ${open ? MW.mint : MW.navy}`, borderRadius: 999, background: '#fff', boxShadow: open ? '0 0 0 4px rgba(39,171,143,0.14)' : 'none', transition: 'box-shadow .2s,border-color .2s' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MW.navy} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                <circle cx="11" cy="11" r="6.5" />
                                <path d="M16 16l4.5 4.5" />
                            </svg>
                            <input
                                ref={inputRef}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onFocus={() => setOpen(true)}
                                enterKeyHint="search"
                                placeholder="ゴビ砂漠、乗馬、星空ツアーを検索"
                                aria-label="ツアーを検索"
                                autoComplete="off"
                                style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 16, color: MW.navy }}
                            />
                            {text && (
                                <button type="button" onClick={() => { setText(''); inputRef.current?.focus(); }} aria-label="クリア" style={{ width: 32, height: 32, border: 0, borderRadius: '50%', background: MW.chip, color: MW.mute, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>
                                    ×
                                </button>
                            )}
                            {!text && !open && (
                                <button type="button" onClick={() => search(hot)} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, height: 34, padding: '0 10px', border: 0, borderRadius: 999, background: 'transparent', fontFamily: 'inherit', cursor: 'pointer' }}>
                                    <span style={{ fontFamily: MW_FONT_EN, fontSize: 9, fontWeight: 700, color: MW.mintDeep, border: `1.5px solid ${MW.mint}`, borderRadius: 6, padding: '2px 5px' }}>HOT</span>
                                    <span style={{ fontSize: 12, color: MW.ink3, minWidth: 48, textAlign: 'left' }}>{hot}</span>
                                </button>
                            )}
                        </form>

                        {open && (
                            <div style={{ position: 'absolute', left: 16, right: 16, top: 52, zIndex: 55, background: '#FFFFFF', border: `1px solid ${MW.line}`, borderRadius: 20, boxShadow: '0 16px 40px rgba(10,31,46,0.14)', padding: '14px 0 8px', maxHeight: '70vh', overflowY: 'auto' }}>
                                {!q && (
                                    <>
                                        {recent.length > 0 && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 8px' }}>
                                                    <span style={panelLabel}>最近の検索</span>
                                                    <button type="button" onClick={() => { setRecent([]); writeRecent([]); }} style={{ border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 12, color: MW.mute2, cursor: 'pointer' }}>
                                                        すべて削除
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 16px 14px' }}>
                                                    {recent.map((r) => (
                                                        <button key={r} type="button" onClick={() => search(r)} style={{ height: 32, padding: '0 12px', border: `1px solid ${MW.line}`, borderRadius: 999, background: '#fff', fontFamily: 'inherit', fontSize: 12, color: MW.ink3, cursor: 'pointer' }}>
                                                            {r}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                        <span style={{ ...panelLabel, display: 'block', padding: '0 16px 8px' }}>人気の検索ワード</span>
                                        {POPULAR.map((p, i) => (
                                            <button key={p} type="button" onClick={() => search(p)} style={panelRow}>
                                                <span style={{ width: 18, fontFamily: MW_FONT_EN, fontSize: 12, fontWeight: 600, color: i < 3 ? MW.mintDeep : MW.mute2 }}>{i + 1}</span>
                                                {p}
                                            </button>
                                        ))}
                                    </>
                                )}
                                {q && (
                                    <>
                                        {fix && fix !== q && (
                                            <button type="button" onClick={() => setText(fix)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px 10px', border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 13, color: MW.mute, cursor: 'pointer', textAlign: 'left' }}>
                                                もしかして：<strong style={{ color: MW.mintDeep }}>{fix}</strong>
                                            </button>
                                        )}
                                        {results.slice(0, 5).map((t) => (
                                            <button key={t.id} type="button" onClick={() => { setOpen(false); navigate(`/products/${t.id}`); }} style={{ ...panelRow, height: 'auto', padding: '8px 16px' }}>
                                                <span style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: isUsableImage(t.image) ? `center/cover url(${t.image})` : MW.mintTint }} />
                                                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                                                    <span style={{ fontSize: 12, color: MW.mute }}>{[t.duration, `${yen(t.price)}〜`].filter(Boolean).join('・')}</span>
                                                </span>
                                            </button>
                                        ))}
                                        {results.length === 0 && (
                                            <span style={{ display: 'block', padding: '12px 16px 16px', fontSize: 13, color: MW.mute }}>「{q}」に一致するツアーは見つかりませんでした。</span>
                                        )}
                                        {results.length > 0 && (
                                            <button type="button" onClick={() => search(fix || q)} style={{ width: 'calc(100% - 32px)', margin: '8px 16px 6px', height: 44, border: 0, borderRadius: 999, background: MW.navy, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}>
                                                「{fix || q}」の検索結果 {results.length}件をすべて見る
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <nav aria-label="メインメニュー" style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 10px' }}>
                        {SITE_NAV.map((n) => {
                            const on = n.match(location.pathname);
                            return (
                                <a
                                    key={n.id}
                                    href={n.path}
                                    onClick={(e) => { e.preventDefault(); navigate(n.path); }}
                                    aria-current={on ? 'page' : undefined}
                                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', height: 42, padding: '0 10px', fontSize: 14, fontWeight: on ? 900 : 500, color: on ? MW.navy : MW.ink3, whiteSpace: 'nowrap', borderBottom: `2px solid ${on ? MW.navy : 'transparent'}`, boxSizing: 'border-box', textDecoration: 'none' }}
                                >
                                    {n.label}
                                </a>
                            );
                        })}
                    </nav>
                </div>
            </header>

            {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
        </>
    );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
    const navigate = useNavigate();
    const { data: me } = useQuery({ queryKey: ['mobileMenu', 'me'], queryFn: () => api.auth.me(), staleTime: 1000 * 60 });
    const go = (path: string) => {
        onClose();
        navigate(path);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', height: 54, padding: '0 20px', border: 0, borderTop: '1px solid #EEF1EF', background: 'transparent', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: MW.navy, cursor: 'pointer', textAlign: 'left' } as const;

    return (
        <div role="dialog" aria-modal="true" aria-label="全体メニュー" style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'center', fontFamily: MW_FONT }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(10,31,46,0.45)' }} />
            <div style={{ position: 'relative', width: '100%', maxWidth: 480, height: '100%', display: 'flex', justifyContent: 'flex-end', pointerEvents: 'none' }}>
                <div style={{ position: 'relative', width: '84%', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto', pointerEvents: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #EEF1EF' }}>
                        <span style={{ fontSize: 15, fontWeight: 900, color: MW.navy }}>全体メニュー</span>
                        <button type="button" onClick={onClose} aria-label="閉じる" style={{ width: 44, height: 44, border: 0, background: 'transparent', fontSize: 22, color: MW.navy, cursor: 'pointer', marginRight: -10 }}>×</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 16 }}>
                        {me ? (
                            <button type="button" onClick={() => go('/mypage')} style={{ ...authBtn, gridColumn: '1 / -1', background: MW.mint, border: 0 }}>マイページ</button>
                        ) : (
                            <>
                                <button type="button" onClick={() => go('/login')} style={authBtn}>ログイン</button>
                                <button type="button" onClick={() => go('/login')} style={{ ...authBtn, background: MW.mint, border: 0 }}>新規登録</button>
                            </>
                        )}
                    </div>
                    {SITE_NAV.map((n) => (
                        <button key={n.id} type="button" onClick={() => go(n.path)} style={row}>
                            {n.label}
                            <span style={{ color: MW.mute2 }}>›</span>
                        </button>
                    ))}
                    <button type="button" onClick={() => go('/faq')} style={{ ...row, borderBottom: '1px solid #EEF1EF' }}>
                        お客様センター
                        <span style={{ color: MW.mute2 }}>›</span>
                    </button>
                    <span style={{ padding: 20, fontSize: 12, fontWeight: 700, color: MW.mintDeep }}>日本語完全対応・現地旅行社</span>
                </div>
            </div>
        </div>
    );
}

const iconBtn = { position: 'relative', width: 44, height: 44, border: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 } as const;
const panelLabel = { fontSize: 12, fontWeight: 700, color: MW.mute } as const;
const panelRow = { width: '100%', display: 'flex', alignItems: 'center', gap: 12, height: 44, padding: '0 16px', border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 14, color: MW.navy, cursor: 'pointer', textAlign: 'left' } as const;
const authBtn = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 12, border: `1px solid ${MW.line}`, background: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: MW.navy, cursor: 'pointer' } as const;
