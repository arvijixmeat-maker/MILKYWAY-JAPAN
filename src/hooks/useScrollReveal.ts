import { useEffect, useRef, useState } from 'react';

/**
 * 스크롤 시 요소를 부드럽게 나타나게 하는 Hook
 * @param threshold 노출 비율 (0.1 = 10% 보일 때 시작)
 */
export const useScrollReveal = (threshold = 0.1) => {
    const ref = useRef<HTMLElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    // 한 번 나타나면 감시 중단 (성능 최적화)
                    if (ref.current) observer.unobserve(ref.current);
                }
            },
            { threshold }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) observer.unobserve(ref.current);
        };
    }, [threshold]);

    return { 
        ref, 
        isVisible,
        revealClass: `transition-all duration-1000 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`
    };
};
