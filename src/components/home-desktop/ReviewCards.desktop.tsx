import { useNavigate } from 'react-router-dom';
import { MW, MW_EYEBROW, MW_SEE_ALL } from '../desktop-primitives/mwTokens';
import type { HomeReview } from './homeDesktopData';

interface Props {
    reviews: HomeReview[];
}

export function ReviewCardsDesktop({ reviews }: Props) {
    const navigate = useNavigate();
    const items = reviews.slice(0, 4);
    if (items.length === 0) return null;

    return (
        <section id="reviews" style={{ marginTop: 104, background: '#FFFFFF' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap', marginBottom: 28 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span style={MW_EYEBROW}>REAL REVIEWS</span>
                        <h2 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>実際の旅行者のレビュー</h2>
                        <p style={{ margin: 0, fontSize: 14, color: MW.mute }}>日本語ガイド同行で安心のモンゴルツアー、お客様の声</p>
                    </div>
                    <a href="/reviews" onClick={(e) => { e.preventDefault(); navigate('/reviews'); }} style={MW_SEE_ALL}>
                        すべて見る →
                    </a>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 20 }}>
                    {items.map((r, i) => (
                        <a
                            key={r.id || i}
                            href={`/reviews/${r.id}`}
                            onClick={(e) => { e.preventDefault(); navigate(`/reviews/${r.id}`); }}
                            style={{ background: '#fff', border: `1px solid ${MW.line}`, borderRadius: 22, padding: 26, display: 'flex', flexDirection: 'column', gap: 14, color: MW.navy, textDecoration: 'none', transition: 'border-color .15s' }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = MW.mintLight)}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = MW.line)}
                        >
                            <span style={{ color: MW.star, fontSize: 15, letterSpacing: 2 }} aria-label={`評価 ${r.rating} / 5`}>
                                {'★'.repeat(r.rating)}
                                <span style={{ color: MW.line2 }}>{'★'.repeat(5 - r.rating)}</span>
                            </span>
                            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.85, color: MW.ink2, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {r.content}
                            </p>
                            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 12, paddingTop: 14, borderTop: `1px solid ${MW.line3}` }}>
                                <span style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, display: 'flex' }}>
                                    <Avatar kind={AVATARS[i % AVATARS.length]} />
                                </span>
                                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <span style={{ fontSize: 14, fontWeight: 700 }}>{r.author ? `${r.author} 様` : 'お客様'}</span>
                                    <span style={{ fontSize: 12, color: MW.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.productName}</span>
                                </span>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}

const AVATARS = ['sheep', 'camel', 'horse', 'marmot'] as const;

/** Illustrated animal avatars from the design (reviewer photos are not shown on the home page). */
function Avatar({ kind }: { kind: (typeof AVATARS)[number] }) {
    const eyes = (y: number) => (
        <>
            <circle cx="15.5" cy={y} r="2.2" fill="#0A1F2E" />
            <circle cx="24.5" cy={y} r="2.2" fill="#0A1F2E" />
            <circle cx="16.2" cy={y - 0.8} r="0.7" fill="#fff" />
            <circle cx="25.2" cy={y - 0.8} r="0.7" fill="#fff" />
            <ellipse cx="12.5" cy={y + 4} rx="2.2" ry="1.4" fill="#FF9FB0" opacity="0.7" />
            <ellipse cx="27.5" cy={y + 4} rx="2.2" ry="1.4" fill="#FF9FB0" opacity="0.7" />
        </>
    );
    return (
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
            {kind === 'sheep' && (
                <>
                    <circle cx="20" cy="20" r="20" fill="#D1F6EA" />
                    <g fill="#FFFFFF" stroke="#E3E6E2" strokeWidth="0.6">
                        <circle cx="13" cy="13" r="5" />
                        <circle cx="20" cy="10.5" r="5.5" />
                        <circle cx="27" cy="13" r="5" />
                        <circle cx="10.5" cy="20" r="4.5" />
                        <circle cx="29.5" cy="20" r="4.5" />
                    </g>
                    <ellipse cx="7.5" cy="19" rx="3.2" ry="1.8" fill="#F4E3D3" transform="rotate(-25 7.5 19)" />
                    <ellipse cx="32.5" cy="19" rx="3.2" ry="1.8" fill="#F4E3D3" transform="rotate(25 32.5 19)" />
                    <ellipse cx="20" cy="22.5" rx="9" ry="9.5" fill="#FFF6EC" />
                    {eyes(21.5)}
                    <path d="M18.2 26.3q1.8 1.6 3.6 0" stroke="#0A1F2E" strokeWidth="1.1" fill="none" strokeLinecap="round" />
                </>
            )}
            {kind === 'camel' && (
                <>
                    <circle cx="20" cy="20" r="20" fill="#A3ECD6" />
                    <ellipse cx="11" cy="12" rx="2.6" ry="3.6" fill="#C98F55" />
                    <ellipse cx="29" cy="12" rx="2.6" ry="3.6" fill="#C98F55" />
                    <ellipse cx="20" cy="20" rx="10.5" ry="11" fill="#E0AC72" />
                    <path d="M14 11q6-4 12 0q-2 3-6 3t-6-3z" fill="#C98F55" />
                    <ellipse cx="20" cy="27" rx="7" ry="5" fill="#F3D2A8" />
                    {eyes(19)}
                    <circle cx="18" cy="26" r="0.9" fill="#8A5A32" />
                    <circle cx="22" cy="26" r="0.9" fill="#8A5A32" />
                    <path d="M18.3 29q1.7 1.2 3.4 0" stroke="#8A5A32" strokeWidth="1" fill="none" strokeLinecap="round" />
                </>
            )}
            {kind === 'horse' && (
                <>
                    <circle cx="20" cy="20" r="20" fill="#D1F6EA" />
                    <path d="M12 9l1.5 5.5-4 .5z" fill="#9A6440" />
                    <path d="M28 9l-1.5 5.5 4 .5z" fill="#9A6440" />
                    <ellipse cx="20" cy="21" rx="9.5" ry="11.5" fill="#B57A4F" />
                    <path d="M13 12q7-6 14 0q-3 1-4 5q-3-4-10-5z" fill="#4A2F20" />
                    <ellipse cx="20" cy="28" rx="7" ry="5" fill="#E2B892" />
                    {eyes(20)}
                    <circle cx="17.8" cy="27.5" r="0.9" fill="#6B4228" />
                    <circle cx="22.2" cy="27.5" r="0.9" fill="#6B4228" />
                    <path d="M18.3 30.3q1.7 1.1 3.4 0" stroke="#6B4228" strokeWidth="1" fill="none" strokeLinecap="round" />
                </>
            )}
            {kind === 'marmot' && (
                <>
                    <circle cx="20" cy="20" r="20" fill="#A3ECD6" />
                    <circle cx="11.5" cy="12.5" r="3.2" fill="#8C6A4A" />
                    <circle cx="28.5" cy="12.5" r="3.2" fill="#8C6A4A" />
                    <circle cx="11.5" cy="12.5" r="1.5" fill="#E7C9A8" />
                    <circle cx="28.5" cy="12.5" r="1.5" fill="#E7C9A8" />
                    <ellipse cx="20" cy="21.5" rx="11" ry="10.5" fill="#A9825C" />
                    <ellipse cx="20" cy="25.5" rx="7.5" ry="6" fill="#EBD3B6" />
                    {eyes(19.5)}
                    <ellipse cx="20" cy="24" rx="1.6" ry="1.1" fill="#5A3E28" />
                    <rect x="18.6" y="26.8" width="1.3" height="2.2" rx="0.4" fill="#fff" />
                    <rect x="20.1" y="26.8" width="1.3" height="2.2" rx="0.4" fill="#fff" />
                </>
            )}
        </svg>
    );
}
