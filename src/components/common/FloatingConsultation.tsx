import React from 'react';
import { useTranslation } from 'react-i18next';

// 회사 LINE 공식계정 채팅 링크 (Footer / QuickLinks와 동일)
const LINE_CHAT_URL = 'https://line.me/ti/p/2mQyucsGcT';

/**
 * 채널톡 런처처럼 모든 고객 페이지에 항상 떠 있는 LINE 상담 바로가기 버튼.
 * 누르면 LINE 공식계정 채팅이 바로 열린다.
 * 위치는 index.css의 `.floating-line-btn`에서 제어 — 채널톡 런처 바로 위에 쌓여 겹치지 않는다.
 */
export const FloatingConsultation: React.FC = () => {
    const { t } = useTranslation();
    const label = t('home.quick_links.line', 'LINEで相談');

    return (
        <a
            href={LINE_CHAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className="floating-line-btn flex items-center justify-center w-[54px] h-[54px] rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg shadow-black/15 active:scale-95 transition-transform"
        >
            <img
                src="/assets/icons/line.webp"
                alt=""
                width={34}
                height={34}
                className="w-[34px] h-[34px] object-contain"
                loading="lazy"
                decoding="async"
            />
        </a>
    );
};
