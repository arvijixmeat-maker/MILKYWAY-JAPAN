import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { HomeData } from '../../hooks/useHomeData';
import { useHeroSlides } from '../../hooks/useHeroSlides';
import { MW, isUsableImage } from '../desktop-primitives/mwTokens';

const GAP = 16;
const W = 'min(880px, calc(100vw - 96px))';

interface Props {
    products: HomeData['products'];
}

export function HeroCarouselDesktop({ products }: Props) {
    const navigate = useNavigate();

    const slides = useHeroSlides(products);

    const n = slides.length;
    const looping = n > 1;
    // Three copies of the slide list; the index lives in the middle copy and
    // silently snaps back there after each transition for an endless loop.
    const [idx, setIdx] = useState(n);
    const [animate, setAnimate] = useState(true);
    const idxRef = useRef(idx);
    useEffect(() => {
        idxRef.current = idx;
    }, [idx]);
    const paused = useRef(false);
    const snapTimer = useRef<number | undefined>(undefined);

    useEffect(() => {
        setIdx(n);
    }, [n]);

    const goTo = useCallback((i: number) => {
        window.clearTimeout(snapTimer.current);
        setAnimate(true);
        setIdx(i);
        snapTimer.current = window.setTimeout(() => {
            if (i >= n && i < 2 * n) return;
            setAnimate(false);
            setIdx(n + (((i - n) % n) + n) % n);
            requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
        }, 620);
    }, [n]);

    useEffect(() => {
        if (!looping) return;
        const t = window.setInterval(() => {
            if (!paused.current && document.visibilityState === 'visible') goTo(idxRef.current + 1);
        }, 5000);
        return () => window.clearInterval(t);
    }, [looping, goTo]);

    useEffect(() => () => window.clearTimeout(snapTimer.current), []);

    const active = looping ? (((idx - n) % n) + n) % n : 0;
    const track = looping ? [0, 1, 2].flatMap((c) => slides.map((s, k) => ({ s, k, pos: c * n + k }))) : slides.map((s, k) => ({ s, k, pos: k }));
    const offset = looping ? idx : 0;

    return (
        <section
            aria-roledescription="carousel"
            aria-label="おすすめ特集"
            style={{ padding: '40px 0 0', overflow: 'hidden', background: '#FFFFFF' }}
            onMouseEnter={() => { paused.current = true; }}
            onMouseLeave={() => { paused.current = false; }}
        >
            <div style={{ position: 'relative', height: 'clamp(300px,36vw,400px)' }}>
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        height: '100%',
                        display: 'flex',
                        gap: GAP,
                        transform: `translateX(calc(${W} / -2 - ${offset} * (${W} + ${GAP}px)))`,
                        transition: animate ? 'transform .6s cubic-bezier(.22,.7,.2,1)' : 'none',
                    }}
                >
                    {track.map(({ s, k, pos }) => {
                        const isCurrent = pos === offset;
                        // Only the middle copy is exposed to crawlers / screen readers.
                        const isPrimary = !looping || (pos >= n && pos < 2 * n);
                        // Loop clones render titles as plain text: one heading per banner.
                        const Heading = isPrimary ? 'h2' : 'div';
                        return (
                            <div
                                key={pos}
                                role="group"
                                aria-roledescription="slide"
                                aria-hidden={!isPrimary || undefined}
                                onClick={() => (isCurrent ? navigate(s.path) : goTo(pos))}
                                style={{
                                    position: 'relative',
                                    flex: `0 0 ${W}`,
                                    width: W,
                                    height: '100%',
                                    borderRadius: 28,
                                    overflow: 'hidden',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    background: `linear-gradient(135deg, ${MW.navySoft} 0%, ${MW.mintDeep} 100%)`,
                                }}
                            >
                                {isUsableImage(s.img) && (
                                    <img
                                        src={s.img}
                                        alt={isPrimary ? `${s.title.replace(/\n/g, ' ')}｜モンゴル旅行・モンゴルツアー専門 Milkyway Japan` : ''}
                                        // Copies share URLs, so eager loading costs one fetch per banner
                                        // and neighbours are already painted when they slide in.
                                        loading="eager"
                                        fetchPriority={isPrimary && k === 0 ? 'high' : 'auto'}
                                        decoding="async"
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                )}
                                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(90deg,rgba(10,31,46,0.72) 0%,rgba(10,31,46,0.35) 45%,rgba(10,31,46,0) 75%)' }} />
                                <div style={{ position: 'absolute', inset: 0, padding: 'clamp(24px,4vw,44px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560 }}>
                                        {s.eyebrow && (
                                            <span style={{ alignSelf: 'flex-start', fontSize: 'clamp(12px,1.2vw,14px)', fontWeight: 700, color: MW.navy, background: MW.mint, padding: '5px 12px', borderRadius: 999 }}>
                                                {s.eyebrow}
                                            </span>
                                        )}
                                        <Heading
                                            style={{ margin: 0, fontSize: 'clamp(24px,3vw,36px)', lineHeight: 1.35, fontWeight: 900, whiteSpace: 'pre-line', wordBreak: 'keep-all', overflowWrap: 'anywhere' }}
                                        >
                                            {s.title}
                                        </Heading>
                                        {s.sub && <span style={{ fontSize: 'clamp(12px,1.1vw,14px)', color: '#CDD8DF' }}>{s.sub}</span>}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
                                        <span style={{ fontSize: 'clamp(16px,1.6vw,20px)', fontWeight: 700 }}>{s.label}</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.4)', padding: '6px 14px', borderRadius: 999 }}>
                                            詳細を見る →
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {looping && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '16px 0 0' }}>
                    {slides.map((s, k) => (
                        <button
                            key={s.key}
                            type="button"
                            aria-label={`スライド ${k + 1}`}
                            aria-current={k === active || undefined}
                            onClick={() => goTo(n + k)}
                            style={{
                                width: k === active ? 28 : 6,
                                height: 6,
                                borderRadius: 3,
                                border: 0,
                                padding: 0,
                                background: k === active ? MW.mint : MW.dot,
                                cursor: 'pointer',
                                transition: 'width .3s',
                            }}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
