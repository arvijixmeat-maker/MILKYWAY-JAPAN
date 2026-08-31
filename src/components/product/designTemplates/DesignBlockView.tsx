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
 * 디자인 원본(Claude Design)이 로드하던 Noto Sans JP 중 사이트 전역 서브셋(400/500/700/800)에
 * 없는 600 웨이트를 디자인 블록이 마운트될 때만 추가 로드한다.
 * 빠지면 브라우저가 500/700으로 대체해 글자 폭·줄바꿈이 원본 디자인과 미묘하게 달라진다.
 */
function useDesignFonts() {
    useEffect(() => {
        const id = 'design-tpl-noto-600';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@600&display=swap';
        document.head.appendChild(link);
    }, []);
}

/**
 * detailBlocks의 'design' 블록 렌더러 (모바일/데스크톱/관리자 미리보기 공용).
 * variant='mobile'이면 템플릿의 모바일 전용 디자인(있을 때)을 렌더링한다.
 * editing=true면 빈 이미지 슬롯에 업로드 안내 placeholder를 표시한다.
 */
export default function DesignBlockView({ content, editing, variant = 'desktop', onFieldClick, selectedField }: {
    content: DesignBlockContent;
    editing?: boolean;
    variant?: 'desktop' | 'mobile';
    /** 미리보기에서 문구/사진을 클릭하면 해당 필드 key로 호출 (관리자 편집기용) */
    onFieldClick?: (key: string) => void;
    /** 현재 편집 중인 필드 — 미리보기에서 초록 테두리로 표시 */
    selectedField?: string | null;
}) {
    useDesignFonts();
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

    const useMobile = variant === 'mobile' && !!def.mobile;
    const Tpl = useMobile ? def.mobile!.Component : def.Component;
    const canvasWidth = useMobile ? def.mobile!.canvasWidth : def.canvasWidth;

    const handleClick = onFieldClick
        ? (e: React.MouseEvent<HTMLDivElement>) => {
            const el = (e.target as HTMLElement).closest?.('[data-df]');
            const key = el?.getAttribute('data-df');
            if (key) {
                e.preventDefault();
                onFieldClick(key);
            }
        }
        : undefined;

    return (
        <div className={onFieldClick ? 'dtpl-clickable' : undefined} onClick={handleClick}>
            {onFieldClick && (
                <style>{`
                    .dtpl-clickable [data-df] { cursor: pointer; pointer-events: auto; }
                    .dtpl-clickable [data-df]:hover { outline: 2px dashed rgba(6,196,160,0.75); outline-offset: 2px; }
                    ${selectedField ? `.dtpl-clickable [data-df="${selectedField}"] { outline: 2px solid #06C4A0; outline-offset: 2px; }` : ''}
                `}</style>
            )}
            <ScaledDesign canvasWidth={canvasWidth}>
                <Tpl v={v} editing={editing} />
            </ScaledDesign>
        </div>
    );
}
