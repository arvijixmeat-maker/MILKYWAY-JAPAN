import type { DetailContentBlock, DayInfoContent } from '../../types/product';

/** 불러올 수 있는 상품 한 줄 — 일정표 블록과 (레거시) 일정 사진만 추린 것 */
export interface ItinerarySource {
    id: string;
    name: string;
    blocks: DetailContentBlock[];
    images: string[];
}

const parseList = (v: unknown): unknown[] => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.trim()) {
        try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
};

/** 상품 API 응답(snake/camel 혼재)에서 일정표만 꺼낸다 */
export function toItinerarySource(item: Record<string, unknown>): ItinerarySource {
    return {
        id: String(item.id ?? ''),
        name: String(item.name ?? ''),
        blocks: parseList(item.itinerary_blocks ?? item.itineraryBlocks) as DetailContentBlock[],
        images: (parseList(item.itinerary_images ?? item.itineraryImages) as unknown[]).filter((s): s is string => typeof s === 'string' && !!s),
    };
}

type PhotoContent = { images?: string[]; heroImage?: string; galleryImages?: string[]; accommodationImages?: string[] } | string;

/** 블록 안에서 처음 나오는 사진 (목록 썸네일용) */
export function firstItineraryImage(src: ItinerarySource): string {
    for (const b of src.blocks) {
        const c = b.content as PhotoContent;
        if (b.type === 'image' && typeof c === 'string' && c) return c;
        if (typeof c === 'object' && c) {
            if (c.heroImage) return c.heroImage;
            if (c.galleryImages?.[0]) return c.galleryImages[0];
            if (c.images?.[0]) return c.images[0];
        }
    }
    return src.images[0] ?? '';
}

export const itineraryDayCount = (src: ItinerarySource) => src.blocks.filter(b => b.type === 'dayInfo').length;

export function itineraryPhotoCount(src: ItinerarySource): number {
    let n = src.images.length;
    for (const b of src.blocks) {
        const c = b.content as PhotoContent;
        if (b.type === 'image' && typeof c === 'string' && c) n++;
        else if (typeof c === 'object' && c) n += (c.images?.length ?? 0) + (c.galleryImages?.length ?? 0) + (c.heroImage ? 1 : 0);
    }
    return n;
}

/**
 * 불러온 일정표를 새 상품에 붙일 수 있게 복제한다 — 블록 id와 내용 id를 모두 새로 발급해
 * 원본 상품과 id가 겹치지 않게 하고, 깊은 복사로 원본 객체를 공유하지 않는다.
 * 사진은 R2 경로 문자열이라 그대로 공유해도 안전하다.
 */
export function cloneItineraryBlocks(blocks: DetailContentBlock[], stamp = Date.now()): DetailContentBlock[] {
    return blocks.map((b, i) => {
        const copy = JSON.parse(JSON.stringify(b)) as DetailContentBlock;
        copy.id = `block-${stamp}-i${i}`;
        if (copy.content && typeof copy.content === 'object' && 'id' in copy.content) {
            (copy.content as DayInfoContent).id = `${copy.type}-${stamp}-${i}`;
        }
        return copy;
    });
}
