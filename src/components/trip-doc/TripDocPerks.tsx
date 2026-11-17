import React from 'react';
import { C } from './tripDocContent';
import { Photo } from './tripDocUi';
import { useDesignGlobalDefaults } from '../product/designTemplates/globalDefaults';
import { getDesignTemplate } from '../product/designTemplates/registry';
import perk1 from '../../assets/perks/perk1-airport.webp';
import perk2 from '../../assets/perks/perk2-mokapot.webp';
import perk3 from '../../assets/perks/perk3-camp.webp';
import perk4 from '../../assets/perks/perk4-socks.webp';
import perk5 from '../../assets/perks/perk5-water.webp';
import perk6 from '../../assets/perks/perk6-milkyway.webp';

/** 견적서용 특전 사진 (src/assets/perks) — 문구는 상품 디자인 「04 이용자 특전」과 같이 쓴다 */
const PERK_IMGS = [perk1, perk2, perk3, perk4, perk5, perk6];

/**
 * 이용자 특전 (「2026年夏ツアーご利用者限定特典」) — 견적서·확정일정표의 금액 아래.
 * 사진은 src/assets/perks, 문구는 상품 상세 디자인 템플릿(horse-trek) 「04 이용자 특전」과 같은 값을 쓴다:
 * 관리자가 사이트 공통값(설정 design_defaults)으로 저장한 문구 → 없으면 템플릿 기본 문구.
 * 그래서 상품 페이지에서 특전 문구를 고치면 견적서에도 그대로 반영된다 (사진은 견적서 전용).
 */
const TEMPLATE_ID = 'horse-trek';

/** 카드 폭(좌우 여백 8px씩 뺀 칸) 안에 한 줄로 들어가는 글자 크기 — 최대 max px. 영숫자는 반 글자로 센다 */
const fitLine = (text: string, max: number) => {
    const units = [...text].reduce((n, ch) => n + (/[\x20-\x7E]/.test(ch) ? 0.55 : 1), 0);
    return `min(${max}px, calc((100cqw - 16px) / ${Math.max(1, units * 0.98).toFixed(2)}))`;
};

export const TripDocPerks: React.FC<{ pad: number; wide: boolean }> = ({ pad, wide }) => {
    const shared = useDesignGlobalDefaults(TEMPLATE_ID);
    const fields = getDesignTemplate(TEMPLATE_ID)?.fields || [];
    const v = (key: string) => {
        const s = shared[key];
        if (s !== undefined && s !== '') return s;
        return fields.find(f => f.key === key)?.default ?? '';
    };
    const perks = [1, 2, 3, 4, 5, 6]
        .map(n => ({ img: PERK_IMGS[n - 1] || v(`perk${n}_img`), title: v(`perk${n}_title`), sub: v(`perk${n}_sub`) }))
        .filter(p => p.title);
    if (!perks.length) return null;

    return (
        <section id="q-perk" style={{ padding: `36px ${pad}px 0`, display: 'flex', flexDirection: 'column', scrollMarginTop: 100 }}>
            {/* 제목은 항상 한 줄 — 글자 수에 맞춰 화면 폭 안에 들어가는 크기 (최대 28px) */}
            <h2 style={{ margin: 0, textAlign: 'center', fontSize: `min(28px, calc((100cqw - ${pad * 2}px) / ${(Math.max(1, [...v('perks_title')].length) * 0.97).toFixed(2)}))`, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.05em', whiteSpace: 'nowrap', color: C.ink }}>{v('perks_title')}</h2>
            {v('perks_sub') && <div style={{ marginTop: 10, textAlign: 'center', fontSize: 13, fontWeight: 600, color: C.sub, letterSpacing: '-0.02em' }}>{v('perks_sub')}</div>}
            <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: `repeat(${wide ? 3 : 2},minmax(0,1fr))`, gap: 9 }}>
                {perks.map((p, i) => (
                    // 카드마다 폭 기준(cqw)을 잡아 제목·설명이 항상 한 줄에 들어가게 한다
                    <div key={i} style={{ position: 'relative', height: wide ? 170 : 160, borderRadius: 14, overflow: 'hidden', background: C.mintBg, containerType: 'inline-size' }}>
                        <Photo src={p.img} alt={p.title} dark={false} />
                        <div style={{ position: 'absolute', inset: 'auto 0 0 0', pointerEvents: 'none', padding: '16px 8px 11px', background: 'linear-gradient(180deg,rgba(0,51,46,0) 0%,rgba(0,51,46,0.72) 100%)', textAlign: 'center', color: '#FFFFFF' }}>
                            <div style={{ fontSize: fitLine(p.title, 13), fontWeight: 800, lineHeight: 1.35, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>{p.title}</div>
                            {p.sub && <div style={{ marginTop: 3, fontSize: fitLine(p.sub, 12), fontWeight: 600, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{p.sub}</div>}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
