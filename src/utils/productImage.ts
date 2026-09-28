const ORIGIN = 'https://mongolryokou.com';
const WIDTHS = [320, 480, 640, 960, 1280, 1720];

/** Only our public uploaded images use the zone's working transformation service. */
export function uploadedImagePath(src: string): string | null {
    try {
        const url = new URL(src, ORIGIN);
        if (url.origin !== ORIGIN && !url.hostname.endsWith('.milkyway-japan-axy.pages.dev')) return null;
        return url.pathname.startsWith('/api/images/') ? url.pathname : null;
    } catch { return null; }
}

export function productImageUrl(src: string, width = 1280): string {
    const path = uploadedImagePath(src);
    if (!path) return src;
    const bounded = WIDTHS.find(w => w >= width) ?? WIDTHS[WIDTHS.length - 1];
    // scale-down preserves the entire image, including long artwork with text.
    return `${ORIGIN}/cdn-cgi/image/width=${bounded},quality=85,format=auto,fit=scale-down${path}`;
}

export function productImageSet(src: string): string | undefined {
    return uploadedImagePath(src) ? WIDTHS.map(w => `${productImageUrl(src, w)} ${w}w`).join(', ') : undefined;
}
