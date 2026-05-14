/**
 * Curated map of well-known Mongolia tourist destinations to their lat/lng.
 *
 * Used by the Destinations Map (mobile + desktop product detail) to plot pins
 * without requiring admins to enter coordinates. We match a tour's itinerary
 * block titles (e.g. "DAY 2: テレルジ国立公園") against these keywords.
 *
 * Keys are normalized lowercase strings; values include the canonical display
 * name and coordinates. Add aliases liberally — matching is substring-based.
 */

export interface MongoliaPlace {
    name: string;       // Display name shown next to the pin
    short?: string;     // Short label used inside the SVG marker (max 8 chars)
    lat: number;
    lng: number;
}

/**
 * Each entry: list of keywords (any one match plots that pin), then the
 * canonical place. Keywords cover Japanese / Mongolian transliterations /
 * English / sometimes Korean so admins can write naturally.
 */
const PLACE_ENTRIES: { keywords: string[]; place: MongoliaPlace }[] = [
    {
        keywords: ['ウランバートル', 'ulaanbaatar', 'ulan bator', 'ub', '울란바토르'],
        place: { name: 'ウランバートル', short: 'UB', lat: 47.9184, lng: 106.9177 },
    },
    {
        keywords: ['テレルジ', 'terelj', '테렐지'],
        place: { name: 'テレルジ国立公園', short: 'Terelj', lat: 47.9833, lng: 107.4667 },
    },
    {
        keywords: ['ハラホリン', 'kharkhorin', 'karakorum', '하라호린'],
        place: { name: 'ハラホリン', short: 'Kharkhorin', lat: 47.1972, lng: 102.8430 },
    },
    {
        keywords: ['ホスタイ', 'hustai', 'khustai'],
        place: { name: 'ホスタイ国立公園', short: 'Hustai', lat: 47.7611, lng: 105.9333 },
    },
    {
        keywords: ['ゴビ砂漠', 'gobi'],
        place: { name: 'ゴビ砂漠', short: 'Gobi', lat: 43.5, lng: 103.4 },
    },
    {
        keywords: ['ヨル渓谷', 'yolyn am', 'yol', 'yoliin'],
        place: { name: 'ヨル渓谷', short: 'Yol', lat: 43.4955, lng: 104.0653 },
    },
    {
        keywords: ['ホンゴル砂丘', 'khongor', 'khongoryn', 'hongoriin'],
        place: { name: 'ホンゴル砂丘', short: 'Khongor', lat: 43.7833, lng: 102.3333 },
    },
    {
        keywords: ['バヤンザグ', 'bayanzag', 'バヤンザク', 'flaming cliffs'],
        place: { name: 'バヤンザグ', short: 'Bayanzag', lat: 44.1500, lng: 103.7167 },
    },
    {
        keywords: ['ダランザドガド', 'dalanzadgad'],
        place: { name: 'ダランザドガド', short: 'Dalanzadgad', lat: 43.5708, lng: 104.4250 },
    },
    {
        keywords: ['フブスグル', 'khövsgöl', 'khovsgol', 'hovsgol', '후브스굴', '훕스굴'],
        place: { name: 'フブスグル湖', short: 'Khövsgöl', lat: 50.7250, lng: 100.1500 },
    },
    {
        keywords: ['ムルン', 'mörön', 'moron', 'murun'],
        place: { name: 'ムルン', short: 'Mörön', lat: 49.6342, lng: 100.1611 },
    },
    {
        keywords: ['ツェツェルレグ', 'tsetserleg'],
        place: { name: 'ツェツェルレグ', short: 'Tsetserleg', lat: 47.4767, lng: 101.4536 },
    },
    {
        keywords: ['アルタイ', 'altai', 'altay'],
        place: { name: 'アルタイ山脈', short: 'Altai', lat: 46.3725, lng: 96.2581 },
    },
    {
        keywords: ['オラーン', 'olgii', 'olgiy'],
        place: { name: 'オラーンバヤン', short: 'Ölgii', lat: 48.9645, lng: 89.9622 },
    },
    {
        keywords: ['草原', 'steppe', '대초원'],
        place: { name: '大草原', short: 'Steppe', lat: 47.5, lng: 105.5 },
    },
];

/**
 * Extract a list of Mongolia destinations from free-form text (itinerary
 * block titles or product description). Returns places in order of first
 * appearance, no duplicates.
 */
export function extractPlacesFromText(text: string): MongoliaPlace[] {
    if (!text) return [];
    const seen = new Set<string>();
    const out: MongoliaPlace[] = [];
    for (const entry of PLACE_ENTRIES) {
        const matched = entry.keywords.some((kw) => text.includes(kw));
        if (matched && !seen.has(entry.place.name)) {
            seen.add(entry.place.name);
            out.push(entry.place);
        }
    }
    return out;
}

/**
 * Extract destinations from an array of itinerary blocks (admin's day-by-day
 * input). Concatenates all titles/descriptions and matches against the place
 * dictionary.
 */
export function extractPlacesFromItinerary(
    blocks: { type: string; content: unknown }[] | undefined
): MongoliaPlace[] {
    if (!blocks || blocks.length === 0) return [];
    const haystack: string[] = [];
    for (const b of blocks) {
        if (!b || !b.content) continue;
        if (typeof b.content === 'object' && b.content !== null) {
            const c = b.content as { title?: string; description?: string; dayLabel?: string };
            if (c.title) haystack.push(c.title);
            if (c.description) haystack.push(c.description);
            if (c.dayLabel) haystack.push(c.dayLabel);
        }
    }
    return extractPlacesFromText(haystack.join(' '));
}
