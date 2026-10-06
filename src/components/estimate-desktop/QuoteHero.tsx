import { useEffect, useRef, useState } from 'react';
import './QuoteHero.css';
import { QUOTE_MEDIA as MEDIA, QUOTE_SCENES as SCENES } from './quoteScenes';

export function QuoteHero({ onHome }: { onHome: () => void }) {
    const root = useRef<HTMLElement>(null);
    const video = useRef<HTMLVideoElement>(null);
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [failed, setFailed] = useState(false);
    // Decide autoplay before attaching a video source (also avoids downloads for reduced motion).
    const [motion, setMotion] = useState<boolean | null>(null);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setMotion(!preference.matches);
        update();
        preference.addEventListener('change', update);
        return () => preference.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        let inView = true;
        const update = () => setVisible(inView && document.visibilityState === 'visible');
        const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); });
        if (root.current) observer.observe(root.current);
        document.addEventListener('visibilitychange', update);
        update();
        return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
    }, []);

    useEffect(() => {
        const element = video.current;
        if (!element) return;
        if (motion && visible && !paused && !failed) {
            void element.play().catch(() => { /* Autoplay may be blocked; the play button stays available. */ });
        } else element.pause();
    }, [motion, visible, paused, failed]);

    const togglePlayback = () => {
        if (playing) {
            setPaused(true);
            video.current?.pause();
        } else {
            setMotion(true);
            setPaused(false);
            // Call within the gesture too, for browsers that block autoplay.
            if (video.current?.getAttribute('src')) void video.current.play().catch(() => {});
        }
    };

    const selectScene = (index: number) => {
        const element = video.current;
        if (!element || element.readyState < 1) return;
        element.currentTime = SCENES[index].start;
        setActive(index);
    };

    return (
        <section ref={root} className="quote-hero" aria-label="モンゴルの旅のご紹介">
            <img className="quote-hero__media" src={`${MEDIA}/poster.webp`} alt="" fetchPriority="high" />
            {!failed && <video
                ref={video}
                className="quote-hero__media"
                src={motion ? `${MEDIA}/journey.mp4` : undefined}
                poster={`${MEDIA}/poster.webp`}
                muted loop playsInline preload="none" aria-hidden="true"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onError={() => { setFailed(true); setPlaying(false); setActive(0); }}
                onTimeUpdate={(event) => {
                    const time = event.currentTarget.currentTime;
                    setActive(SCENES.reduce((index, scene, next) => time >= scene.start ? next : index, 0));
                }}
            />}
            <div className="quote-hero__shade" />
            <div className="quote-hero__content">
                <nav className="quote-hero__breadcrumb" aria-label="パンくずリスト">
                    <a href="/" onClick={(event) => { event.preventDefault(); onHome(); }}>ホーム</a>
                    <span aria-hidden="true">›</span><span>お見積もり</span>
                </nav>
                <div className="quote-hero__intro">
                    <span className="quote-hero__badge">100% プライベートツアー</span>
                    <h1>オーダーメイド見積もり</h1>
                    <p>人数・期間・予算・行きたい場所をお伝えください。<br className="quote-hero__desktop-break" />日本語スタッフが24時間以内に最適なプランをお見積もりします。</p>
                </div>
                <div className="quote-hero__footer">
                    <div className="quote-hero__caption">
                        <strong>{SCENES[active].title}</strong>
                        <span>{SCENES[active].subtitle}</span>
                    </div>
                    {!failed && <div className="quote-hero__controls">
                        {motion && SCENES.map((scene, index) => <button
                            className="quote-hero__scene" key={scene.title} type="button"
                            aria-label={scene.title} aria-current={index === active || undefined}
                            onClick={() => selectScene(index)}
                        ><span /></button>)}
                        <button className="quote-hero__play" type="button" onClick={togglePlayback}
                            aria-label={playing ? '動画を一時停止' : '動画を再生'}>
                            {playing ? '一時停止' : '再生'}
                        </button>
                    </div>}
                </div>
            </div>
        </section>
    );
}
