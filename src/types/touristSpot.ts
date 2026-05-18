// Tourist spot master record — reusable across timeline blocks.
// When picked from the picker modal, fills a timeline block's
// title / description / images in one click.
/**
 * Region tag — used so the admin can filter the spot library by region
 * (Central Mongolia / Gobi / Hovsgol) when picking from the timeline editor.
 * Empty string = uncategorized (legacy rows or admin chose not to set).
 */
export type SpotRegion = 'central' | 'gobi' | 'hovsgol' | '';

export const SPOT_REGION_OPTIONS: { value: SpotRegion; label: string }[] = [
    { value: 'central', label: '중앙몽골' },
    { value: 'gobi', label: '고비사막' },
    { value: 'hovsgol', label: '홉스굴' },
];

export interface TouristSpot {
    id: string;
    name_kr: string;         // 대제목 (필수, 일정 제목으로 들어감)
    name_local?: string;     // 소제목 (일정 카드 부제목)
    address?: string;
    description?: string;    // 일정 설명으로 들어감
    images?: string[];       // 일정 이미지로 들어감
    region?: SpotRegion;     // 중앙몽골/고비사막/홉스굴 분류 (빈 문자열 = 미분류)
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}
