import type React from 'react';

/**
 * 디자인 템플릿 — 코드로 내장된 상세페이지 디자인.
 *
 * Claude Design 등에서 만든 고정폭(캔버스) 디자인을 React 컴포넌트로 이식하고,
 * 편집 가능한 지점(텍스트/이미지)을 매니페스트로 선언한다.
 * 관리자 페이지는 매니페스트를 읽어 자동으로 폼을 생성하고,
 * 입력값은 상품 detailBlocks 안의 design 블록(content.values)에 저장된다.
 */
export type DesignFieldType = 'text' | 'textarea' | 'image';

export interface DesignTemplateField {
    key: string;
    /** 관리자 폼에 표시되는 라벨 */
    label: string;
    type: DesignFieldType;
    /** 관리자 폼에서 묶어 보여줄 섹션 이름 */
    section: string;
    /** 값이 비어있을 때 사용할 기본값 (텍스트 전용; 이미지 기본값은 빈 슬롯) */
    default?: string;
    /** 입력 형식 안내 (선택) */
    help?: string;
}

export interface DesignTemplateValues {
    /** field key → 관리자가 입력한 값(텍스트 또는 이미지 URL) */
    [key: string]: string;
}

export interface DesignTemplateProps {
    /** field key로 최종 값(입력값 ?? default ?? '')을 돌려주는 getter */
    v: (key: string) => string;
    /** true면 빈 이미지 슬롯에 안내 placeholder를 표시(관리자 미리보기용) */
    editing?: boolean;
}

export interface DesignTemplateDef {
    id: string;
    /** 관리자에게 표시되는 템플릿 이름 */
    name: string;
    /** 디자인 원본 캔버스 폭(px). 화면에서는 컨테이너 폭에 맞춰 축소된다 */
    canvasWidth: number;
    fields: DesignTemplateField[];
    Component: React.ComponentType<DesignTemplateProps>;
}
