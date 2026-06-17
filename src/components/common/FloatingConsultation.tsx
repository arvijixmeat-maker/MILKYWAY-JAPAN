import React from 'react';
import { useTranslation } from 'react-i18next';

// 회사 LINE 공식계정 채팅 링크 (Footer / QuickLinks와 동일)
const LINE_CHAT_URL = 'https://line.me/ti/p/2mQyucsGcT';

/**
 * 채널톡 런처처럼 모든 고객 페이지에 항상 떠 있는 LINE 상담 바로가기 버튼.
 * 누르면 LINE 공식계정 채팅이 바로 열린다.
 * 채널톡 런처는 iframe 안에 들어 있어 외부에서 정확한 크기/위치를 읽을 수 없으므로,
 * 겹침을 피하려고 채널톡(우측 하단) 반대편 **좌측 하단**에 같은 높이로 배치한다.
 * 위치 제어는 index.css의 `.floating-line-btn` 참고.
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
            className="floating-line-btn flex items-center justify-center w-[56px] h-[56px] rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg shadow-black/15 active:scale-95 transition-transform"
        >
            <img
                src="/assets/icons/line.webp"
                alt=""
                width={38}
                height={38}
                className="w-[38px] h-[38px] object-contain"
                loading="lazy"
                decoding="async"
            />
        </a>
    );
};
