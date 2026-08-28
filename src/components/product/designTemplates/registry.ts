import type { DesignTemplateDef } from './types';
import { horseTrekFields } from './horseTrekFields';
import HorseTrekTemplate from './HorseTrekTemplate';

/**
 * 사용 가능한 디자인 템플릿 목록.
 * 새 디자인을 추가할 때: 템플릿 컴포넌트 + 필드 매니페스트를 만들고 여기에 등록한다.
 */
export const designTemplates: DesignTemplateDef[] = [
    {
        id: 'horse-trek',
        name: '몽골 승마 트레킹 상세페이지',
        canvasWidth: 860,
        fields: horseTrekFields,
        Component: HorseTrekTemplate,
    },
];

export function getDesignTemplate(id: string): DesignTemplateDef | undefined {
    return designTemplates.find(t => t.id === id);
}
