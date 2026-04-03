
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
 * Cloudflare Image Resizing을 활용하여 최적화된 URL을 반환합니다.
 * @param url 원본 이미지 URL
 * @param preset 이미지 용도 프리셋
 */
export function getOptimizedImageUrl(
    url: string | undefined | null,
    preset: ImagePreset = 'contentImage'
): string {
    if (!url) return '';

    // 로컬 에셋이나 데이터 URL은 변환 제외
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
        const multiplier = 2; // Retina 2x
        if ('width' in options) params.push(`w${Math.round(Number(options.width) * multiplier)}`);
        params.push('rw'); // Force WebP
        return `${baseUrl}=${params.join('-')}`;
    }

    // Cloudflare Image Resizing 사용
    // 형식: /cdn-cgi/image/width=X,quality=Y,format=webp/URL
    const options = IMAGE_PRESETS[preset];
    if (!('width' in options)) return url;

    const width = options.width;
    const quality = options.quality || 80;
    const fit = (options as any).fit || 'cover';

    // Cloudflare 로직 적용 (동일 도메인 내 이미지는 도메인 생략 가능하지만, 안전을 위해 전체 URL 사용)
    return `/cdn-cgi/image/width=${width},quality=${quality},format=webp,fit=${fit}/${url}`;
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
