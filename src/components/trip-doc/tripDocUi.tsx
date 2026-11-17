import React, { useState } from 'react';
import { C } from './tripDocContent';
import { anton } from './tripDocStyle';

/** 사진 — 부모 박스를 꽉 채운다. 없으면 자리표시 */
export const Photo: React.FC<{ src?: string; alt?: string; placeholder?: string; dark?: boolean; eager?: boolean; style?: React.CSSProperties }> = ({ src, alt, placeholder, dark = true, eager, style }) => {
    // 실패한 주소를 기억해 두고, 주소가 바뀌면 자동으로 다시 시도한다
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    if (src && failedSrc !== src) {
        return <img src={src} alt={alt || placeholder || ''} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedSrc(src)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }} />;
    }
    return (
        <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, textAlign: 'center', fontSize: 11, lineHeight: 1.4, color: dark ? 'rgba(255,255,255,0.55)' : C.mute, background: dark ? 'radial-gradient(ellipse at 50% 40%,#2C5552 0%,#1C4A48 70%)' : `linear-gradient(160deg,${C.mintBg} 0%,${C.gray} 100%)` }}>
            {placeholder || ''}
        </span>
    );
};

export const Svg: React.FC<{ d: string; size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }> = ({ d, size = 18, stroke = C.mintDeep, sw = 1.9, style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={d} /></svg>
);


/** 섹션 머리 — 영문 대제목 + 타원 라벨 + 큰 일본어 제목 */
export const SectionHead: React.FC<{ en: string; pill?: string; children?: React.ReactNode; lead?: string }> = ({ en, pill, children, lead }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ ...anton, fontSize: 'clamp(28px,7.2cqw,60px)', fontWeight: 400, lineHeight: 0.95, color: C.ink, marginBottom: 4 }}>{en}</span>
        {lead && <span style={{ fontSize: 'clamp(14px,3.6cqw,19px)', fontWeight: 500, letterSpacing: '-0.02em', color: C.ink }}>{lead}</span>}
        {pill && <span style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', minHeight: 30, padding: '2px 16px', border: `1.5px solid ${C.ink}`, borderRadius: '50%', fontSize: 12, fontWeight: 600, letterSpacing: '-0.02em', color: C.ink, whiteSpace: 'nowrap' }}>{pill}</span>}
        {children}
    </div>
);

/** 큰 제목 한 줄 — parts 중 accent 는 민트색 */
export const BigLine: React.FC<{ parts: Array<string | { a: string }>; size?: string; weight?: number }> = ({ parts, size = 'clamp(21px,5.4cqw,46px)', weight = 800 }) => (
    <span style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: size, fontWeight: weight, lineHeight: 1.1, letterSpacing: '-0.05em', color: C.ink }}>
        {parts.map((p, i) => typeof p === 'string'
            ? <span key={i}>{p}</span>
            : <span key={i} style={{ color: C.mint }}>{p.a}</span>)}
    </span>
);

/** 「ツアー [料金]」 형식 — 두 번째 단어를 남색 칩으로 */
export const ChipTitle: React.FC<{ before?: string; chip: string; after?: string; size?: string; gradient?: boolean }> = ({ before, chip, after, size = 'clamp(20px,5.1cqw,30px)', gradient }) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: size, fontWeight: 700, letterSpacing: '-0.04em', color: C.ink, whiteSpace: 'nowrap' }}>
        {before && <span>{before}</span>}
        <span style={{ padding: '1px 10px 5px', borderRadius: 12, background: gradient ? C.grad : C.ink, color: gradient ? '#FFFFFF' : C.mintPale }}>{chip}</span>
        {after && <span>{after}</span>}
    </span>
);

export const Gap: React.FC = () => <div aria-hidden="true" style={{ height: 8, background: C.gray }} />;

/** 흐르는 띠 — MONGOLIA ✳ MILKY WAY ✳ PRIVATE TOUR */
export const Band: React.FC<{ dark?: boolean; reduce: boolean }> = ({ dark, reduce }) => {
    const words = ['MONGOLIA', 'MILKY WAY', 'PRIVATE TOUR', 'MONGOLIA', 'MILKY WAY', 'PRIVATE TOUR'];
    const run = (k: number) => (
        <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 16, paddingRight: 16, flexShrink: 0 }}>
            {words.map((w, i) => <React.Fragment key={i}><span>{w}</span><span style={{ fontFamily: "'Noto Sans JP',sans-serif", fontSize: '0.9em' }}>✳</span></React.Fragment>)}
        </span>
    );
    return (
        <div aria-hidden="true" style={{ overflow: 'hidden', background: dark ? C.ink : '#FFFFFF', borderTop: `1.5px solid ${C.ink}`, borderBottom: `1.5px solid ${C.ink}`, padding: '9px 0' }}>
            <div style={{ display: 'flex', width: 'max-content', ...anton, fontSize: 15, letterSpacing: '0.04em', color: dark ? C.mintSoft : C.ink, animation: reduce ? 'none' : 'qBand 22s linear infinite' }}>
                {run(0)}{run(1)}
            </div>
        </div>
    );
};

export const Dots: React.FC<{ count: number; idx: number; onGo: (i: number) => void; label: string; activeW?: number; activeBg?: string; idleBg?: string }> = ({ count, idx, onGo, label, activeW = 22, activeBg = C.ink, idleBg = '#C9D8D4' }) => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
        {Array.from({ length: count }).map((_, i) => (
            <button key={i} type="button" aria-label={`${label} ${i + 1}`} onClick={() => onGo(i)}
                style={{ width: i === idx ? activeW : 6, height: 6, padding: 0, border: 0, borderRadius: 3, background: i === idx ? activeBg : idleBg, cursor: 'pointer', transition: 'width .3s, background .3s' }} />
        ))}
    </div>
);

