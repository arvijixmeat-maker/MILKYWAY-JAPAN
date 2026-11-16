import type React from 'react';
import { useEffect, useSyncExternalStore } from 'react';
import { C } from './tripDocContent';

/** 디자인 시안의 애니메이션 정의 — 페이지에 한 번만 넣는다 */
export const TRIP_DOC_CSS = `
.tdoc{margin:0;color:${C.ink};font-family:'Noto Sans JP','Pretendard Variable',Pretendard,sans-serif;-webkit-font-smoothing:antialiased;word-break:normal;line-break:strict}
.tdoc a{color:${C.ink};text-decoration:none}
.tdoc [data-noscroll]::-webkit-scrollbar{display:none}
.tdoc button{font-family:inherit}
.tdoc .td-hov:hover{background:${C.mintBg}!important}
.tdoc .td-lift{transition:transform .25s cubic-bezier(.22,.61,.36,1)}
.tdoc .td-lift:hover{transform:translateY(-3px)}
@keyframes qKen{0%{transform:scale(1.08) translate(0,0)}100%{transform:scale(1.18) translate(-2%,-2%)}}
@keyframes qUp{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:none}}
@keyframes qFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes qFloat2{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(9px) rotate(-4deg)}}
@keyframes qNum{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.03)}}
@keyframes qSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes qBand{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes qRowR{0%{transform:translateX(-50%)}100%{transform:translateX(0)}}
@keyframes qStayFade{0%{opacity:1;transform:scale(1)}28%{opacity:1;transform:scale(1.06)}36%{opacity:0;transform:scale(1.08)}92%{opacity:0;transform:scale(1)}100%{opacity:1;transform:scale(1)}}
@keyframes qPrint{0%{transform:translateY(-100%)}100%{transform:translateY(0)}}
@keyframes qFilm{0%{opacity:0;visibility:visible}4%{opacity:1}46%{opacity:1}51%{opacity:0;visibility:visible}52%{visibility:hidden}100%{opacity:0;visibility:hidden}}
@keyframes qFilmKen{0%{transform:scale(1.02)}100%{transform:scale(1.14)}}
@keyframes qBar1{0%{width:0}50%{width:100%}100%{width:100%}}
@keyframes qBar2{0%{width:0}50%{width:0}100%{width:100%}}
@media (prefers-reduced-motion: reduce){.tdoc *{animation:none!important;transition:none!important}}
@media print{
  .tdoc-noprint{display:none!important}
  .tdoc *{animation:none!important}
  .tdoc{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .tdoc section{break-inside:avoid-page}
  .floating-line-btn,#ch-plugin-entry,#ch-plugin-launcher{display:none!important}
}
`;

const REDUCE_Q = '(prefers-reduced-motion: reduce)';
const subscribeReduce = (cb: () => void) => {
    const mq = typeof window !== 'undefined' ? window.matchMedia?.(REDUCE_Q) : undefined;
    mq?.addEventListener?.('change', cb);
    return () => mq?.removeEventListener?.('change', cb);
};
const getReduce = () => (typeof window !== 'undefined' && !!window.matchMedia?.(REDUCE_Q).matches);

/** 「동작 줄이기」 설정 — 켜져 있으면 애니메이션을 멈춘다 */
export function useReducedMotion(): boolean {
    return useSyncExternalStore(subscribeReduce, getReduce, () => false);
}

/** 디자인 시안의 웹폰트 (Anton·Inter·Jost·Mrs Saint Delafield·Noto Sans JP) */
export function useTripDocFonts() {
    useEffect(() => {
        const id = 'tdoc-fonts';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@300;400;500;700;800&family=Anton&family=Jost:wght@300;400;500&family=Mrs+Saint+Delafield&display=swap';
        document.head.appendChild(link);
    }, []);
}

export const anton: React.CSSProperties = { fontFamily: "'Anton',sans-serif" };
export const inter: React.CSSProperties = { fontFamily: "'Inter',sans-serif" };
