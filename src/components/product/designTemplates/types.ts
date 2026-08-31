import type React from 'react';
import type { DesignSectionInstance } from '../../../types/product';

/**
 * 디자인 템플릿 — 코드로 내장된 상세페이지 디자인.
 *
 * Claude Design 등에서 만든 고정폭(캔버스) 디자인을 React 컴포넌트로 이식하고,
 * 편집 가능한 지점(텍스트/이미지)을 매니페스트로 선언한다.
 * 관리자 페이지는 매니페스트를 읽어 자동으로 폼을 생성하고,
 * 입력값은 상품 detailBlocks 안의 design 블록(content.values)에 저장된다.
 */
export type DesignFieldType = 'text' | 'textarea' | 'image' | 'map-stops';

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
    /**
     * 표시할 섹션 인스턴스 목록. 없으면 템플릿 기본 섹션 전체를 한 번씩 표시.
     * 복제본은 같은 섹션을 접미사 붙은 key로 다시 렌더링한다.
     */
    instances?: DesignSectionInstance[];
}

/** 템플릿이 가진 섹션 정의 — 관리자에서 복제/삭제하는 단위 */
export interface DesignSectionDef {
    /** 섹션 id (관리자 목록에 그대로 표시된다) */
    id: string;
    /** 이 섹션이 포함하는 매니페스트 필드 section 이름들 */
    fieldSections: string[];
    /** false면 복제 버튼을 숨긴다 (한 번만 있어야 자연스러운 섹션) */
    repeatable?: boolean;
}

export interface DesignTemplateDef {
    id: string;
    /** 관리자에게 표시되는 템플릿 이름 */
    name: string;
    /** 디자인 원본 캔버스 폭(px). 화면에서는 컨테이너 폭에 맞춰 축소된다 */
    canvasWidth: number;
    fields: DesignTemplateField[];
    /** 관리자에서 복제·삭제할 수 있는 섹션 목록 (표시 순서) */
    sectionDefs: DesignSectionDef[];
    Component: React.ComponentType<DesignTemplateProps>;
    /**
     * 모바일 전용 디자인(별도 캔버스). 있으면 모바일 상세페이지는 이쪽을 렌더링한다.
     * 필드 매니페스트는 데스크톱과 공유한다 — 같은 key, 같은 입력값.
     */
    mobile?: {
        canvasWidth: number;
        Component: React.ComponentType<DesignTemplateProps>;
    };
}
