


/**
 * Image Optimization Utility
 * Uses wsrv.nl (free image proxy) to optimize images on the fly.
 * 
 * Features:
 * - Auto WebP conversion
 * - High quality compression (default 80%)
 * - Retina support (2x resolution)
 * - Smart resizing
 */

interface OptimizeOptions {
    width?: number;
    height?: number;
    quality?: number; // 0-100, default 80
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export const optimizeImage = (url: string, options: OptimizeOptions = {}): string => {
    if (!url) return '';

    // Skip optimization for data URLs (base64) or local assets
    // - Ends with .mp4 or similar local paths
    // - R2 storage URLs which might block wsrv.nl proxy
    if (
        url.startsWith('data:') ||
        url.startsWith('/') ||
        url.includes('localhost') ||
        url.includes('127.0.0.1') ||
        url.includes('r2.dev') ||
        !url.startsWith('http')
    ) {
        return url;
    }

    const {
        width,
        height,
        quality = 80, // Reduced from 100 for massive savings
        fit = 'cover'
    } = options;

    // Supabase Storage 이미지 - Native SIT 사용
    if (url.includes('supabase.co/storage/v1/object/public/')) {
        if (!width) return url;

        // render 엔드포인트로 변환
        const renderUrl = url.replace(
            '/storage/v1/object/public/',
            '/storage/v1/render/image/public/'
        );

        const params = new URLSearchParams();
        params.append('width', width.toString());
        if (height) params.append('height', height.toString());
        params.append('quality', quality.toString());
        params.append('resize', fit);

        return `${renderUrl}?${params.toString()}`;
    }

    // Strategy 1: Native Google Image Optimization (Fastest & Best)
    if (url.includes('googleusercontent.com') || url.includes('lh3.google')) {
        const baseUrl = url.split('=')[0];
        const params: string[] = [];
        if (width) params.push(`w${width * 2}`); // Retina 2x
        if (height) params.push(`h${height * 2}`);
        params.push('rw'); // Force WebP
        params.push('nu'); // No upscale
        return `${baseUrl}=${params.join('-')}`;
    }

    // Strategy 2: Universal Image Proxy (wsrv.nl)
    const baseUrl = 'https://wsrv.nl/';

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    // Cap at 1.5x for efficiency, 2x for very small items
    const pixelRatio = (width && width > 400) ? Math.min(dpr, 1.5) : Math.min(dpr, 2);

    const params = new URLSearchParams({
        url: url,
        w: width ? String(width * pixelRatio) : '',
        h: height ? String(height * pixelRatio) : '',
        q: String(quality),
        fit: fit,
        output: 'webp',
        n: '-1' // optimize even if cached
    });

    // Clean up empty params
    if (!width) params.delete('w');
    if (!height) params.delete('h');

    return `${baseUrl}?${params.toString()}`;
};
