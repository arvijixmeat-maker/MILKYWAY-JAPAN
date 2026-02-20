export interface TourProduct {
    id: string;

    // 기본 정보
    name: string;
    description?: string; // Short description or subtitle
    category: string; // '중앙몽골' | '고비사막' | '홉스굴' | '트레킹/골프' | '기업/단체'
    duration: string;

    // 가격 정보
    price: number;
    originalPrice?: number;

    // 이미지
    mainImages: string[]; // 메인 이미지들 (여러 개)
    galleryImages: string[];
    detailImages: string[]; // 상세 정보 이미지들 (레거시)
    detailSlides?: DetailSlide[]; // 슬라이드형 상세 정보 (레거시)
    detailBlocks?: DetailContentBlock[]; // 통합된 상세 컨텐츠 (이미지+슬라이드)
    itineraryImages: string[]; // 일정 이미지들 (레거시 - 단순 리스트)
    itineraryBlocks?: DetailContentBlock[]; // 통합된 일정 컨텐츠 (이미지+슬라이드)

    // 상태 및 노출
    status: 'active' | 'inactive' | 'soldout';
    isFeatured: boolean;
    isPopular?: boolean;

    // 상세 정보
    tags: string[];
    highlights: {
        icon: string;
        title: string;
        description: string;
    }[];

    // 포함/불포함
    included: string[];
    excluded: string[];

    // 메타 정보
    createdAt: string;
    updatedAt: string;
    viewCount: number;
    bookingCount: number;

    // 옵션
    pricingOptions?: TourPricingOption[];
    accommodationOptions?: AccommodationOption[];
    vehicleOptions?: VehicleOption[];
}

export interface TourPricingOption {
    people: number;         // 인원 수 (예: 2, 3, 4...)
    pricePerPerson: number; // 1인당 가격 (총 금액)
    depositPerPerson: number; // 1인당 예약금
    localPaymentPerPerson: number; // 1인당 현지 지불 잔금
}

export interface AccommodationOption {
    id: string;
    name: string;           // 숙소 이름 (예: "게르", "호텔")
    description: string;    // 설명
    imageUrl?: string;      // 이미지 (선택)
    priceModifier: number;  // 추가/할인 금액 (+50000, -20000 등)
    isDefault?: boolean;    // 기본 선택 여부
}

export interface VehicleOption {
    id: string;
    name: string;           // 차량 이름 (예: "봉고", "SUV")
    description: string;    // 설명
    priceModifier: number;  // 추가/할인 금액
    isDefault?: boolean;    // 기본 선택 여부
}

export interface DetailSlide {
    id: string;
    type: 'day' | 'option' | 'accommodation' | 'free'; // 슬라이드 종류
    dayLabel?: string;      // 예: "1-2일차", "옵션 A"
    title: string;          // 슬라이드 제목
    description?: string;   // 슬라이드 설명
    images: string[];       // 슬라이드 이미지들
}

export interface DividerContent {
    style: 'line' | 'space';
    height: number;
}

export type DetailBlockType = 'image' | 'slide' | 'divider';

export interface DetailContentBlock {
    id: string;
    type: DetailBlockType;
    content: string | DetailSlide | DividerContent;
}

