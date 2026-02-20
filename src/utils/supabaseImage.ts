import { supabase } from '../lib/supabaseClient';
import { optimizeImage } from './imageOptimizer';

// 전체 사이트의 이미지 용도별 프리셋 정의
export const IMAGE_PRESETS = {
    // 상품 관련
    productThumbnail: { width: 400, quality: 80, fit: 'contain' },      // 상품 목록 썸네일 (잘림 방지)
    productDetail: { width: 1200, quality: 90 },        // 상품 상세 이미지
    productItinerary: { width: 1600, quality: 100 },    // 일정 이미지 (텍스트 선명도 중요)

    // 배너/히어로 이미지
    heroBanner: { width: 1080, quality: 80, fit: 'contain' },           // 메인 배너 (잘림 방지)
    mobileBanner: { width: 640, quality: 80, fit: 'contain' },          // 모바일 배너 (잘림 방지)

    // 콘텐츠 이미지
    contentImage: { width: 800, quality: 85 },          // 본문 이미지
    thumbnailSmall: { width: 200, quality: 75 },        // 작은 썸네일
    iconSmall: { width: 128, quality: 80, fit: 'contain' }, // 아이콘용 (확대/잘림 방지)

    // 원본
    original: {}                                         // 변환 없음
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

/**
 * Supabase Image Transformation을 활용하여 최적화된 URL을 반환합니다.
 * @param url 원본 이미지 URL (이미 저장된 전체 경로)
 * @param preset 이미지 용도 프리셋
 */
export function getOptimizedImageUrl(
    url: string | undefined | null,
    preset: ImagePreset = 'contentImage'
): string {
    if (!url) return '';

    // 로컬 에셋이나 데이터 URL은 변환 제외
    // - '/', 'data:', 'localhost'로 시작하거나
    // - 'http'로 시작하지 않는 상대 경로인 경우 로컬 에셋으로 간주
    if (
        url.startsWith('data:') ||
        url.startsWith('/') ||
        url.includes('localhost') ||
        url.includes('127.0.0.1') ||
        !url.startsWith('http')
    ) {
        return url;
    }

    // Google 이미지는 별도 처리 유지 (속도 및 호환성)
    if (url.includes('googleusercontent.com') || url.includes('lh3.google')) {
        const baseUrl = url.split('=')[0];
        const options = IMAGE_PRESETS[preset];
        const params: string[] = [];
        // Retina 대응: 항상 2배 (품질 우선)
        // const multiplier = preset.toLowerCase().includes('banner') ? 1.5 : 2;
        const multiplier = 2;
        if ('width' in options) params.push(`w${Math.round(Number(options.width) * multiplier)}`);
        params.push('rw'); // Force WebP
        return `${baseUrl}=${params.join('-')}`;
    }

    // Supabase Storage 이미지 - Native SIT 사용
    if (url.includes('supabase.co/storage/v1/object/public/')) {
        const options = IMAGE_PRESETS[preset];

        // 'original' 프리셋이거나 옵션이 없으면 원본 반환
        if (!('width' in options)) {
            return url;
        }

        // 400 에러를 방지하기 위해 항상 기본 supabase.co 도메인 사용
        // (커스텀 도메인 환경에서 SIT가 오작동하는 경우 대비)
        let sitUrl = url;
        if (url.includes('mongolia-milkyway.com')) {
            // 커스텀 도메인을 프로젝트 URL로 변경 (필요한 경우)
            // sitUrl = url.replace('mongolia-milkyway.com', 'hbcuqrqtipcnjhdyksz.supabase.co');
        }

        // render 엔드포인트로 변환
        const renderUrl = sitUrl.replace(
            '/storage/v1/object/public/',
            '/storage/v1/render/image/public/'
        );

        const params = new URLSearchParams();
        params.append('width', options.width.toString());
        params.append('quality', (options.quality || 80).toString());

        // 프리셋에 fit 옵션이 있으면 사용, 없으면 배너 등은 cover가 기본
        const fit = (options as any).fit || 'cover';
        params.append('resize', fit);

        return `${renderUrl}?${params.toString()}`;
    }

    // 외부 이미지는 기존 optimizeImage (wsrv.nl fallback 등) 활용
    const options = IMAGE_PRESETS[preset];
    return optimizeImage(url, {
        width: 'width' in options ? Number(options.width) : undefined,
        height: 'height' in options ? Number(options.height) : undefined,
        quality: 'quality' in options ? Number(options.quality) : 85,
    });
}

/**
 * 반응형 이미지를 위한 srcset 속성 정보를 반환합니다.
 */
export function getResponsiveImageProps(
    url: string | undefined | null,
    type: 'product' | 'banner' | 'content' = 'content'
) {
    if (!url) return { src: '', srcSet: '', sizes: '' };

    const configs = {
        product: {
            presets: ['productThumbnail', 'productDetail'] as ImagePreset[],
            sizes: '(max-width: 640px) 400px, 800px'
        },
        banner: {
            presets: ['mobileBanner', 'heroBanner'] as ImagePreset[],
            sizes: '(max-width: 640px) 640px, 1200px'
        },
        content: {
            presets: ['thumbnailSmall', 'contentImage'] as ImagePreset[],
            sizes: '(max-width: 480px) 200px, 800px'
        }
    };

    const config = configs[type];
    const srcSetParts = config.presets.map(preset => {
        const optimizedUrl = getOptimizedImageUrl(url, preset);
        const width = (IMAGE_PRESETS[preset] as any).width || 1920;
        return `${optimizedUrl} ${width}w`;
    });

    return {
        src: getOptimizedImageUrl(url, config.presets[1]), // 중간 크기를 기본 src로
        srcSet: srcSetParts.join(', '),
        sizes: config.sizes
    };
}
