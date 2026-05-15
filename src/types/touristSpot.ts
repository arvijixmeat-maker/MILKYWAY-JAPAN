// Tourist spot master record — reusable across timeline blocks.
// When picked from the picker modal, fills a timeline block's
// title / description / images in one click.
export interface TouristSpot {
    id: string;
    name_kr: string;         // 한글 명칭 (필수, 일정 제목으로 들어감)
    name_local?: string;     // 현지/영문 명칭
    address?: string;
    description?: string;    // 일정 설명으로 들어감
    images?: string[];       // 일정 이미지로 들어감
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}
