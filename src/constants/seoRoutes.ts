const PUBLIC_STATIC_PATHS = new Set([
    '/',
    '/about',
    '/custom-estimate',
    '/faq',
    '/guide-apply',
    '/privacy-policy',
    '/products',
    '/reviews',
    '/terms-of-service',
    '/travel-guide',
    '/travel-mates',
]);

const PUBLIC_DYNAMIC_PATTERNS = [
    /^\/category\/[^/]+$/,
    /^\/products\/[^/]+$/,
    /^\/reviews\/[^/]+$/,
    /^\/travel-guide\/[^/]+$/,
    /^\/travel-mates\/[^/]+$/,
];

const PRIVATE_PATTERNS = [
    /^\/admin(?:\/|$)/,
    /^\/chats(?:\/|$)/,
    /^\/documents(?:\/|$)/,
    /^\/estimate(?:\/|$)/,
    /^\/estimate-complete$/,
    /^\/guide(?:\/|$)/,
    /^\/login$/,
    /^\/my-booking(?:\/|$)/,
    /^\/mypage(?:\/|$)/,
    /^\/payment$/,
    /^\/reservation(?:\/|$)/,
    /^\/reservation-complete$/,
    /^\/reservation-status$/,
    /^\/reviews\/write$/,
    /^\/travel-mates\/write$/,
];

export const normalizeSeoPath = (path: string) => {
    const normalized = (`/${String(path || '').replace(/^\/+/, '')}`).replace(/\/{2,}/g, '/');
    return normalized === '/' ? '/' : normalized.replace(/\/$/, '');
};

export const isPrivateSeoPath = (path: string) => {
    const normalized = normalizeSeoPath(path);
    return PRIVATE_PATTERNS.some((pattern) => pattern.test(normalized));
};

export const isKnownPublicSeoPath = (path: string) => {
    const normalized = normalizeSeoPath(path);
    return PUBLIC_STATIC_PATHS.has(normalized)
        || PUBLIC_DYNAMIC_PATTERNS.some((pattern) => pattern.test(normalized));
};

export const isKnownAppSeoPath = (path: string) =>
    isPrivateSeoPath(path) || isKnownPublicSeoPath(path);
