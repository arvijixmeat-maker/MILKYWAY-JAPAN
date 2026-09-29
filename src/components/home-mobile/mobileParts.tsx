import { useWishlist } from '../../hooks/useWishlist';
import { MW, MW_FONT_EN } from '../desktop-primitives/mwTokens';
import type { HomeProduct } from '../home-desktop/homeDesktopData';

/** Shared pieces of the mobile tour cards (home and tour list). */

export function Photo({ src, alt }: { src: string; alt: string }) {
    if (!src) return null;
    return <img src={src} alt={alt} loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />;
}

/** PREMIUM / STANDARD from the admin's 여행 타입; hidden when unset. */
export function TypeBadge({ p }: { p: HomeProduct }) {
    if (!p.packageType) return null;
    const full = p.packageType === 'full';
    return (
        <span style={{ position: 'absolute', left: 8, bottom: 8, fontFamily: MW_FONT_EN, fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', padding: '3px 7px', borderRadius: 999, background: full ? MW.mintDeep : 'rgba(255,255,255,0.92)', color: full ? '#FFFFFF' : MW.mintDeep, pointerEvents: 'none' }}>
            {full ? 'PREMIUM' : 'STANDARD'}
        </span>
    );
}

export function Heart({ p, size }: { p: HomeProduct; size: number }) {
    const wishlist = useWishlist();
    const on = wishlist.has(p.id);
    return (
        <button
            type="button"
            aria-label={on ? 'お気に入りから削除' : 'お気に入りに追加'}
            aria-pressed={on}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); wishlist.toggle(p); }}
            style={{ position: 'absolute', right: 6, top: 6, width: size, height: size, border: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
            <svg width="17" height="17" viewBox="0 0 24 24" fill={on ? MW.red : 'none'} stroke={on ? MW.red : MW.navy} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
            </svg>
        </button>
    );
}
