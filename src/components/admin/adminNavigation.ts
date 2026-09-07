export interface AdminNavItem {
    id: string;
    icon: string;
    label: string;
    description: string;
    href: string;
    keywords?: string[];
}

export interface AdminNavGroup {
    label: string;
    items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
    {
        label: '업무 홈',
        items: [
            { id: 'dashboard', icon: 'dashboard', label: '운영 대시보드', description: '오늘 처리할 업무와 운영 현황', href: '/admin', keywords: ['홈', '통계'] },
        ],
    },
    {
        label: '예약 운영',
        items: [
            { id: 'quotes', icon: 'request_quote', label: '맞춤견적', description: '문의 확인, 견적 작성과 예약 전환', href: '/admin/quotes', keywords: ['문의', '견적서'] },
            { id: 'reservations', icon: 'confirmation_number', label: '예약·결제', description: '예약, 입금, 일정표와 계약서', href: '/admin/reservations', keywords: ['고객', '페이팔', '계약서', '일정표'] },
            { id: 'accommodation-ops', icon: 'bed', label: '숙소·차량 배정', description: '일자별 객실, 가이드와 차량 수배', href: '/admin/accommodation-ops', keywords: ['수배', '객실', '배정'] },
            { id: 'guides', icon: 'badge', label: '가이드 관리', description: '가이드 등록, 승인과 연락처', href: '/admin/guides', keywords: ['배정', '승인'] },
            { id: 'guide-settlements', icon: 'receipt_long', label: '가이드 정산', description: '투어 예산, 지출 증빙과 정산 승인', href: '/admin/guide-settlements', keywords: ['비용', '영수증', '몽골', '정산'] },
            { id: 'calendar', icon: 'calendar_month', label: '출발 캘린더', description: '출발일과 준비 상태를 달력으로 확인', href: '/admin/calendar', keywords: ['일정', '출발'] },
        ],
    },
    {
        label: '상품·자료',
        items: [
            { id: 'products', icon: 'inventory_2', label: '상품 관리', description: '상품, 가격, 일정과 상세페이지', href: '/admin/products', keywords: ['가격', '옵션'] },
            { id: 'templates', icon: 'dashboard', label: '일정표 템플릿', description: '확정일정표와 문서 템플릿', href: '/admin/templates', keywords: ['문서', '계약'] },
            { id: 'hotels', icon: 'apartment', label: '호텔 마스터', description: '호텔 기본정보와 이미지', href: '/admin/hotels', keywords: ['숙박'] },
            { id: 'accommodations', icon: 'holiday_village', label: '숙소 리소스', description: '게르와 기타 숙박시설', href: '/admin/accommodations', keywords: ['게르', '캠프'] },
            { id: 'tourist-spots', icon: 'location_on', label: '관광지 마스터', description: '관광지 정보와 운영 자료', href: '/admin/tourist-spots', keywords: ['장소'] },
            { id: 'design-spots', icon: 'photo_library', label: '여행지 사진', description: '상세페이지 공용 이미지', href: '/admin/design-spots', keywords: ['이미지', '사진'] },
        ],
    },
    {
        label: '콘텐츠',
        items: [
            { id: 'magazines', icon: 'auto_stories', label: '매거진', description: '여행 콘텐츠 작성과 공개', href: '/admin/magazines', keywords: ['글', '콘텐츠'] },
            { id: 'reviews', icon: 'reviews', label: '고객 후기', description: '후기 검수와 노출 관리', href: '/admin/reviews', keywords: ['리뷰'] },
            { id: 'faq', icon: 'help', label: '공통 FAQ', description: '사이트 공통 질문과 답변', href: '/admin/faq', keywords: ['질문'] },
            { id: 'tour-faqs', icon: 'help_outline', label: '상품 FAQ', description: '상품별 질문과 답변', href: '/admin/tour-faqs', keywords: ['투어'] },
            { id: 'guide-intro', icon: 'translate', label: '가이드 소개', description: '고객용 공통 가이드 안내', href: '/admin/guide-intro', keywords: ['일본어'] },
        ],
    },
    {
        label: '사이트 설정',
        items: [
            { id: 'banners', icon: 'view_carousel', label: '홈 화면', description: '메인 배너와 바로가기', href: '/admin/banners', keywords: ['배너'] },
            { id: 'categories', icon: 'category', label: '카테고리', description: '상품 분류와 노출 순서', href: '/admin/categories', keywords: ['분류'] },
        ],
    },
];

export const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

export const ADMIN_OPERATION_FLOW = [
    { id: 'quotes', step: '01', label: '견적 접수', href: '/admin/quotes' },
    { id: 'reservations', step: '02', label: '예약·결제', href: '/admin/reservations' },
    { id: 'accommodation-ops', step: '03', label: '숙소·차량', href: '/admin/accommodation-ops' },
    { id: 'guides', step: '04', label: '가이드', href: '/admin/guides' },
    { id: 'guide-settlements', step: '05', label: '비용 정산', href: '/admin/guide-settlements' },
    { id: 'calendar', step: '06', label: '출발 관리', href: '/admin/calendar' },
];
