import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

/**
 * 견적 편집기 — 일정표 위의 「고객 요청 정리」 카드 (관리자 전용).
 * 고객이 일본어로 쓴 요청을 한국어로 옮기고, 원하는 것 · 꼭 지킬 조건 · 피할 것 · 답해 줄 질문으로 나눠 보여 준다.
 * 한 번 만든 정리는 이 브라우저에 보관해 다시 열 때 AI 를 또 부르지 않는다.
 */
interface Summary { headlineKo: string; whoKo: string; wantsKo: string[]; mustsKo: string[]; avoidsKo: string[]; questionsKo: string[]; translationKo: string }

const C = { ink: '#123B3A', sub: '#5F7674', mute: '#8A9E9B', body: '#3F5856', line: '#E6EFEC', line2: '#EEF3F1', bg: '#F7FAF9', mint: '#00A88B', mintDeep: '#007F75', mintBg: '#E8FAF5', amberBg: '#FFF4D6', amberFg: '#8A5A00', redBg: '#FFF1F0', redFg: '#B42318', grayBg: '#F3F6F5' };
const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
        style={{ flex: 'none', transform: `rotate(${open ? 180 : 0}deg)`, transition: 'transform .2s' }}><path d="M6 9l6 6 6-6" /></svg>
);

export const RequestSummaryCard: React.FC<{ quoteId: string }> = ({ quoteId }) => {
    const key = `mw-req-ko:${quoteId}`;
    const [sum, setSum] = useState<Summary | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'failed'>('loading');
    const [error, setError] = useState('');
    const [open, setOpen] = useState(true);
    const [showFull, setShowFull] = useState(false);

    const load = async (force = false) => {
        if (!force) {
            try { const saved = localStorage.getItem(key); if (saved) { setSum(JSON.parse(saved)); setState('ready'); return; } } catch { /* 보관함을 못 쓰면 새로 만든다 */ }
        }
        setState('loading'); setError('');
        try {
            const r: any = await api.quotes.requestSummary(quoteId);
            if (!r?.summary) { setState('empty'); return; }
            setSum(r.summary); setState('ready');
            try { localStorage.setItem(key, JSON.stringify(r.summary)); } catch { /* 보관 실패는 무시 */ }
        } catch (e) { setError(e instanceof Error ? e.message : '요청을 정리하지 못했습니다.'); setState('failed'); }
    };
    useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [quoteId]);

    if (state === 'empty') return null; // 고객이 적은 요청 글이 없는 견적
    const box: React.CSSProperties = { padding: '18px 24px', borderRadius: 20, background: '#FFFFFF', border: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 14 };
    const group = (title: string, items: string[], bg: string, fg: string) => items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', borderRadius: 14, background: bg, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: fg }}>{title} <span style={{ fontWeight: 600, opacity: 0.7 }}>{items.length}</span></span>
            {items.map((t, i) => (
                <span key={i} style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.6, color: C.ink }}>
                    <span style={{ flex: 'none', color: fg }}>·</span><span style={{ minWidth: 0 }}>{t}</span>
                </span>
            ))}
        </div>
    );

    return (
        <section style={box}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open}
                    style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: 0, border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left', color: C.ink }}>
                    <span style={{ flex: 'none', height: 22, padding: '0 8px', borderRadius: 6, background: C.mintBg, fontSize: 11, fontWeight: 700, color: C.mintDeep, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>고객 요청 정리</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, whiteSpace: open ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {state === 'loading' ? '고객 요청을 한국어로 정리하는 중입니다… (10~20초)' : state === 'failed' ? '요청을 정리하지 못했습니다' : sum?.headlineKo || '고객 요청'}
                    </span>
                    <Chevron open={open} />
                </button>
                {state !== 'loading' && (
                    <button type="button" onClick={() => void load(true)} title="고객 요청을 다시 읽고 정리합니다"
                        style={{ flex: 'none', height: 28, padding: '0 10px', border: `1px solid ${C.line}`, borderRadius: 8, background: '#fff', fontSize: 11, fontWeight: 700, color: C.sub, cursor: 'pointer', whiteSpace: 'nowrap' }}>다시 정리</button>
                )}
            </div>

            {open && state === 'failed' && <span style={{ fontSize: 12.5, fontWeight: 600, color: C.redFg }}>{error}</span>}
            {open && state === 'ready' && sum && (
                <>
                    {sum.whoKo && <span style={{ fontSize: 13, color: C.body }}>{sum.whoKo}</span>}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 10 }}>
                        {group('원하는 것', sum.wantsKo, C.mintBg, C.mintDeep)}
                        {group('꼭 지켜야 할 조건', sum.mustsKo, C.amberBg, C.amberFg)}
                        {group('피하고 싶은 것', sum.avoidsKo, C.redBg, C.redFg)}
                        {group('답해 줘야 할 질문', sum.questionsKo, C.grayBg, C.sub)}
                    </div>
                    {sum.translationKo && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button type="button" onClick={() => setShowFull(v => !v)} aria-expanded={showFull}
                                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: 0, border: 0, background: 'transparent', fontSize: 12, fontWeight: 700, color: C.sub, cursor: 'pointer' }}>
                                <Chevron open={showFull} />요청 전문 번역 {showFull ? '접기' : '보기'}
                            </button>
                            {showFull && <div style={{ padding: '14px 16px', borderRadius: 14, background: C.bg, fontSize: 13, lineHeight: 1.8, color: C.body, whiteSpace: 'pre-wrap' }}>{sum.translationKo}</div>}
                        </div>
                    )}
                    <span style={{ fontSize: 11, color: C.mute }}>AI가 고객 요청 글을 한국어로 옮겨 정리한 것입니다 · 관리자만 보이며 고객에게 나가지 않습니다</span>
                </>
            )}
        </section>
    );
};
