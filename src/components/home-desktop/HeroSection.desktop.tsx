import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { HomeData } from '../../hooks/useHomeData';
import { api } from '../../lib/api';
import { MatIcon } from '../desktop-primitives/MatIcon';
import { TagChip, type TagTone } from '../desktop-primitives/TagChip';

interface HeroSectionDesktopProps {
    /** Kept for backward compatibility; banners are fetched directly. */
    tabs?: HomeData['tabs'];
    contentWidth?: number;
}

interface HeroSlide {
    img: string;
    tag: string;
    tone: TagTone;
    eyebrow: string;
    title: string;
    title2: string;
    body: string;
    cta: string;
}

const FALLBACK_SLIDES: HeroSlide[] = [
    {
        img: '/og-image.jpg',
        tag: 'PREMIUM TRIP',
        tone: 'premium',
        eyebrow: '2026 SEASON',
        title: '地平線の果てで出会う',
        title2: '太古の大自然、モンゴル',
        body: '日本語ガイド同行の現地旅行社が、ウランバートルから草原・砂漠まで、あなただけの旅をご提案します。',
        cta: '/products',
    },
];

// Strings the admin tooling inserts as placeholders that we should never display.
const DEFAULT_TEXTS = new Set([
    'New Tag', 'new tag', '새로운 배너 타이틀', '배너 설명을 입력하세요', 'Premium Trip',
]);
const clean = (v: string | undefined): string => {
    const s = (v || '').trim();
    return s && !DEFAULT_TEXTS.has(s) ? s : '';
};

interface ApiBanner {
    id: string;
    image?: string;
    image_url?: string;
    pc_image?: string;   // PC-only wide-aspect image. Admin uploads via banner manage page.
    pcImage?: string;
    tag?: string;
    title?: string;
    subtitle?: string;
    link?: string;
    // PC-only text overrides. Each falls back to its mobile equivalent above.
    pc_title?: string;
    pcTitle?: string;
    pc_subtitle?: string;
    pcSubtitle?: string;
    pc_tag?: string;
    pcTag?: string;
}

export function HeroSectionDesktop({ contentWidth = 1280 }: HeroSectionDesktopProps) {
    const navigate = useNavigate();

    // Fetch banners directly — mirrors src/components/home/HeroSection.tsx.
    // /api/banners returns { banners, quickLinks, eventBanners, categoryTabs }.
    const { data: slides = FALLBACK_SLIDES } = useQuery<HeroSlide[]>({
        queryKey: ['heroBannersDesktop'],
        queryFn: async () => {
            try {
                const data = await api.banners.get();
                const raw: ApiBanner[] = Array.isArray(data?.banners) ? data.banners : [];
                if (raw.length === 0) return FALLBACK_SLIDES;
                return raw.slice(0, 5).map((b, i): HeroSlide => {
                    // PC-specific text overrides take precedence; mobile values are
                    // the fallback. Admin can leave PC fields blank to reuse mobile.
                    const pcTitle = clean(b.pc_title || b.pcTitle);
                    const pcSubtitle = clean(b.pc_subtitle || b.pcSubtitle);
                    const pcTag = clean(b.pc_tag || b.pcTag);
                    const title = pcTitle || clean(b.title);
                    const subtitle = pcSubtitle || clean(b.subtitle);
                    const tag = pcTag || clean(b.tag);
                    const lines = title.split('\n');
                    // Prefer the PC-specific wide image when admin uploaded one,
                    // then fall back to the mobile image, then to the bundled fallback.
                    const pcImg = b.pc_image || b.pcImage || '';
                    return {
                        img: pcImg || b.image || b.image_url || FALLBACK_SLIDES[0].img,
                        tag: (tag || 'PREMIUM TRIP').toUpperCase().slice(0, 24),
                        tone: (['premium', 'hot', 'new'] as TagTone[])[i % 3],
                        eyebrow: tag || '2026 SEASON',
                        title: lines[0] || FALLBACK_SLIDES[0].title,
                        title2: lines[1] || (lines.length === 1 ? '' : subtitle) || FALLBACK_SLIDES[0].title2,
                        body: subtitle || FALLBACK_SLIDES[0].body,
                        cta: b.link || '/products',
                    };
                });
            } catch (e) {
                console.error('Hero banners fetch error:', e);
                return FALLBACK_SLIDES;
            }
        },
        staleTime: 1000 * 60 * 5,
    });

    const [idx, setIdx] = useState(0);
    useEffect(() => {
        if (slides.length <= 1) return;
        const tm = setInterval(() => setIdx((i) => (i + 1) % slides.length), 6500);
        return () => clearInterval(tm);
    }, [slides.length]);

    const safeIdx = Math.min(idx, Math.max(0, slides.length - 1));
    const cur = slides[safeIdx] || FALLBACK_SLIDES[0];

    // Soft brand-color gradient — used when the slide has no usable image (e.g.,
    // admin hasn't uploaded a banner yet) so we never render a broken-image black box.
    const fallbackGradient =
        'linear-gradient(135deg, #134e4a 0%, #115e59 35%, #0f766e 65%, #0a4a45 100%)';
    const hasUsableImage = (img: string) =>
        !!img && img !== '/og-image.jpg' && (img.startsWith('http') || img.startsWith('/'));

    return (
        <section style={{ position: 'relative', height: 640, overflow: 'hidden', background: '#0b0b0b' }}>
            {slides.map((sl, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: hasUsableImage(sl.img) ? `url(${sl.img})` : fallbackGradient,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: i === idx ? 1 : 0,
                        transition: 'opacity 1200ms var(--ease-out)',
                        transform: i === idx ? 'scale(1.02)' : 'scale(1)',
                    }}
                />
            ))}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                        'linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.15) 70%, transparent 100%), linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 40%)',
                }}
            />

            <div
                style={{
                    position: 'relative',
                    maxWidth: contentWidth,
                    height: '100%',
                    margin: '0 auto',
                    padding: '0 32px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    color: '#fff',
                }}
            >
                <div style={{ maxWidth: 780 }}>
                    <div style={{ marginBottom: 22, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <TagChip tone={cur.tone}>{cur.tag}</TagChip>
                        <span
                            style={{
                                fontSize: 12,
                                fontWeight: 500,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: 'rgba(255,255,255,0.85)',
                            }}
                        >
                            {cur.eyebrow}
                        </span>
                    </div>
                    <h1
                        style={{
                            // Auto-shrink font for long Japanese headlines so each
                            // admin-entered line actually fits on ONE visual line in
                            // the 780px text column. Japanese full-width chars are
                            // ~0.92em wide, so:
                            //   60px × 0.92 = 55px/char → 780/55 ≈ 14 chars max
                            //   54px × 0.92 = 50px/char → 780/50 ≈ 15 chars max
                            //   46px × 0.92 = 42px/char → 780/42 ≈ 18 chars max
                            //   38px × 0.92 = 35px/char → 780/35 ≈ 22 chars max
                            fontSize: (() => {
                                const longest = Math.max(cur.title.length, cur.title2?.length || 0);
                                if (longest > 21) return 36;
                                if (longest > 17) return 44;
                                if (longest > 14) return 52;
                                return 60;
                            })(),
                            fontWeight: 700,
                            lineHeight: 1.18,
                            margin: 0,
                            letterSpacing: '-0.02em',
                            textShadow: '0 2px 24px rgba(0,0,0,0.3)',
                            // Japanese has no spaces; prevent mid-word wraps that
                            // looked like 「果てしない大草原を駆 / ける乗馬ツアー」.
                            wordBreak: 'keep-all',
                            overflowWrap: 'break-word',
                        }}
                    >
                        {cur.title}
                        {cur.title2 && (
                            <>
                                <br />
                                {cur.title2}
                            </>
                        )}
                    </h1>
                    {cur.body && (
                        <p
                            style={{
                                fontSize: 16,
                                lineHeight: 1.7,
                                marginTop: 22,
                                color: 'rgba(255,255,255,0.92)',
                                maxWidth: 520,
                                fontWeight: 400,
                            }}
                        >
                            {cur.body}
                        </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 36 }}>
                        <button
                            type="button"
                            onClick={() => navigate(cur.cta)}
                            style={{
                                padding: '16px 28px',
                                background: '#fff',
                                color: 'var(--fg-1)',
                                border: 'none',
                                borderRadius: 999,
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 10,
                            }}
                        >
                            詳細を見る <MatIcon name="arrow_forward" size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/custom-estimate')}
                            style={{
                                padding: '16px 28px',
                                background: 'rgba(255,255,255,0.1)',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.3)',
                                borderRadius: 999,
                                backdropFilter: 'blur(8px)',
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
                        >
                            1分でリクエスト
                        </button>
                    </div>
                </div>

                {/* Pagination dots */}
                {slides.length > 1 && (
                    <div style={{ position: 'absolute', bottom: 36, left: 32, display: 'flex', gap: 8, alignItems: 'center' }}>
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                aria-label={`slide ${i + 1}`}
                                onClick={() => setIdx(i)}
                                style={{
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    width: i === idx ? 32 : 8,
                                    height: 4,
                                    borderRadius: 99,
                                    background: i === idx ? '#fff' : 'rgba(255,255,255,0.4)',
                                    transition: 'all 300ms',
                                }}
                            />
                        ))}
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginLeft: 12, letterSpacing: '0.05em' }}>
                            {String(idx + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
                        </span>
                    </div>
                )}

                {/* Trust badges floating bottom right */}
                <div style={{ position: 'absolute', bottom: 36, right: 32, display: 'flex', gap: 14, alignItems: 'center' }}>
                    {[
                        { i: 'verified', t: '日本語完全対応' },
                        { i: 'support_agent', t: '24時間サポート' },
                        { i: 'shield_person', t: '現地旅行社' },
                    ].map((b) => (
                        <div
                            key={b.t}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 14px',
                                background: 'rgba(0,0,0,0.35)',
                                backdropFilter: 'blur(8px)',
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 500,
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.12)',
                            }}
                        >
                            <MatIcon name={b.i} size={16} filled color="#5eead4" /> {b.t}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
