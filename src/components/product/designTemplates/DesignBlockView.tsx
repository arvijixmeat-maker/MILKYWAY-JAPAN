import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { DesignBlockContent } from '../../../types/product';
import { getDesignTemplate } from './registry';

/**
 * 고정폭 캔버스 디자인을 컨테이너 폭에 맞춰 축소해 보여주는 래퍼.
 * (이미지로 올리던 상세페이지와 동일하게, 폭이 좁아지면 전체가 비율 축소된다)
 */
function ScaledDesign({ canvasWidth, children }: { canvasWidth: number; children: React.ReactNode }) {
    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [height, setHeight] = useState<number | undefined>(undefined);

    const measure = useCallback(() => {
        const outer = outerRef.current;
        const inner = innerRef.current;
        if (!outer || !inner) return;
        const s = Math.min(outer.clientWidth / canvasWidth, 1);
        setScale(s);
        setHeight(inner.offsetHeight * s);
    }, [canvasWidth]);

    useEffect(() => {
        measure();
        const ro = new ResizeObserver(measure);
        if (outerRef.current) ro.observe(outerRef.current);
        if (innerRef.current) ro.observe(innerRef.current);
        return () => ro.disconnect();
    }, [measure]);

    return (
        <div ref={outerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: canvasWidth * scale, height, overflow: 'hidden' }}>
                <div ref={innerRef} style={{ width: canvasWidth, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

/**
 * detailBlocks의 'design' 블록 렌더러 (모바일/데스크톱/관리자 미리보기 공용).
 * editing=true면 빈 이미지 슬롯에 업로드 안내 placeholder를 표시한다.
 */
export default function DesignBlockView({ content, editing }: { content: DesignBlockContent; editing?: boolean }) {
    const def = getDesignTemplate(content?.templateId);

    const defaults: Record<string, string> = {};
    if (def) {
        for (const f of def.fields) defaults[f.key] = f.default ?? '';
    }
    const values = content?.values || {};
    const v = (key: string) => {
        const raw = values[key];
        return raw !== undefined && raw !== '' ? raw : (defaults[key] ?? '');
    };

    if (!def) {
        if (import.meta.env.DEV) {
            console.warn('[DesignBlockView] Unknown design template:', content?.templateId);
        }
        return null;
    }

    const Tpl = def.Component;
    return (
        <ScaledDesign canvasWidth={def.canvasWidth}>
            <Tpl v={v} editing={editing} />
        </ScaledDesign>
    );
}
