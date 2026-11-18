import type { CostCategory, CostUnit } from '../../src/lib/pricing';

/**
 * 원가표 초기 데이터 — 2026-11 에 받은 원가표(입장료·투어 원가 / 협력업체 식당 / 숙소 단가 화면)에서 옮긴 값.
 * 숙박은 「지역 × 등급에서 가장 높은 단가」(오너 방침). 모두 「확인 필요」로 들어가며, 관리자가 확인하고 표시를 끈다.
 * [분류, 지역, 항목, 등급, 단위, 단가(₮), 메모]
 */
type Row = [CostCategory, string, string, string, CostUnit, number, string];

const STAY: Row[] = [
    // 울란바타르 호텔 — 객실(2인 1실) 1박
    ['stay', '울란바타르', '호텔 5성급', '5성급', 'room_night', 608000, 'Holiday Inn 트윈'],
    ['stay', '울란바타르', '호텔 4성급', '4성급', 'room_night', 396000, 'Grand Hill 트윈 (4.5성 Corporate 556,870)'],
    ['stay', '울란바타르', '호텔 3성급', '3성급', 'room_night', 375000, 'Sunjin Grand 더블 Superior — 일반 객실 최고는 Premium 322,000'],
    // 게르·캠프 — 1인 1박 (혼자 쓰는 「1인」 요금은 제외한 최고가)
    ['stay', '테를지', '일반 게르', '일반 게르', 'person_night', 135000, 'Guru tour 2인 이상 · 테를지 게르는 조식 포함'],
    ['stay', '테를지', '고급 게르', '고급 게르', 'person_night', 315000, 'Red rock resort · 규칙 예시는 290,000 — 확인'],
    ['stay', '엘승타사르해(미니사막)', '일반 게르', '일반 게르', 'person_night', 175000, 'Бичигт Хад 2인 객실 350,000 ÷ 2 · 조식 포함'],
    ['stay', '엘승타사르해(미니사막)', '고급 게르', '고급 게르', 'person_night', 300000, 'Бичигт Хад 2인 객실 600,000 ÷ 2 · Burd Star 2인 240,000 · 규칙 예시는 290,000'],
    ['stay', '호스타이', '일반 게르', '일반 게르', 'person_night', 170000, 'Hustain 7/1〜15 요금 (평소 160,000)'],
    ['stay', '호스타이', '고급 게르', '고급 게르', 'person_night', 250000, 'LUX 게르'],
    ['stay', '하라호린', '일반 게르', '일반 게르', 'person_night', 190000, 'Munkh Tenger 1〜3인'],
    ['stay', '하라호린', '고급 게르', '고급 게르', 'person_night', 250000, 'Torgonii zam 고급room 2인 (고급게르 Ikh Mongol 210,000)'],
    ['stay', '쳉헤르 온천', '일반 게르', '일반 게르', 'person_night', 220000, 'Duut Resort'],
    ['stay', '쳉헤르 온천', '고급 게르', '고급 게르', 'person_night', 290000, 'Sunpath Luxury house'],
    ['stay', '어기 호수', '일반 게르', '일반 게르', 'person_night', 110000, 'Ugii dalai 2인 이상'],
    ['stay', '어기 호수', '고급 게르', '고급 게르', 'person_night', 198000, 'Ugii khishig 하우스 2인 (첨척 게르 188,000)'],
    ['stay', '어르헝 폭포', '일반 게르', '일반 게르', 'person_night', 70000, 'Хөсөг жуулчны бааз'],
    ['stay', '홉스굴', '일반 게르', '일반 게르', 'person_night', 275000, 'Double Lake 2인 이상'],
    ['stay', '홉스굴', '고급 게르', '고급 게르', 'person_night', 370000, 'Toilogt 하우스 (고급 게르 Капитан 260,000)'],
    ['stay', '차강소브라가', '일반 게르', '일반 게르', 'person_night', 135000, ''],
    ['stay', '차강소브라가', '고급 게르', '고급 게르', 'person_night', 245000, ''],
    ['stay', '홍고린엘스', '일반 게르', '일반 게르', 'person_night', 175000, 'Gobiin bayan burd 1〜3인'],
    ['stay', '홍고린엘스', '고급 게르', '고급 게르', 'person_night', 330000, 'Gobi Discovery'],
    ['stay', '바양작', '일반 게르', '일반 게르', 'person_night', 160000, 'Gobi Tour'],
    ['stay', '바양작', '고급 게르', '고급 게르', 'person_night', 270000, 'Говь Мираж LUX'],
    ['stay', '바가 가즈링 촐로', '일반 게르', '일반 게르', 'person_night', 170000, ''],
    ['stay', '바가 가즈링 촐로', '고급 게르', '고급 게르', 'person_night', 220000, ''],
    ['stay', '욜린암·달란자드가드', '일반 게르', '일반 게르', 'person_night', 175000, 'Gobiin bayan burd 1〜3인'],
    ['stay', '욜린암·달란자드가드', '고급 게르', '고급 게르', 'person_night', 385000, 'Gobiin bayan burd YOL'],
    ['stay', '옹기', '일반 게르', '일반 게르', 'person_night', 130000, ''],
    ['stay', '옹기', '고급 게르', '고급 게르', 'person_night', 235000, 'Ongi Energy'],
];

const FEES: Row[] = [
    ['transfer', '공항', '공항 이동 — 스타렉스·푸르공', '', 'vehicle', 20000, '편도 1회'],
    ['transfer', '공항', '공항 이동 — 알파트·승용차', '', 'vehicle', 10000, '편도 1회'],
    ['transfer', '공항', '공항 이동 — 대형·중형 버스', '', 'vehicle', 40000, '편도 1회'],
    ['entrance', '울란바타르', '국립박물관', '', 'person', 30000, ''],
    ['entrance', '울란바타르', '전통공연', '', 'person', 50000, ''],
    ['entrance', '테를지', '테를지 입장 — 스타렉스·푸르공', '', 'vehicle', 30000, '인원당/차량당 기준 확인 필요'],
    ['entrance', '테를지', '테를지 입장 — 알파트·승용차', '', 'vehicle', 9000, ''],
    ['entrance', '테를지', '테를지 입장 — 중형 버스(25명)', '', 'vehicle', 50000, ''],
    ['entrance', '테를지', '테를지 입장 — 대형 버스(45명)', '', 'vehicle', 74000, ''],
    ['entrance', '테를지', '칭기스칸 기마상', '', 'person', 30000, '견적 시트에는 22,000'],
    ['entrance', '테를지', '아리야발 사원', '', 'person', 5000, ''],
    ['activity', '테를지', '승마', '', 'person', 20000, '고객 2명당 마부 1명분 추가'],
    ['entrance', '엘승타사르해(미니사막)', '톨게이트', '', 'vehicle', 2000, ''],
    ['activity', '엘승타사르해(미니사막)', '낙타', '', 'person', 20000, '고객 2명당 마부 1명분 추가'],
    ['activity', '엘승타사르해(미니사막)', '유목민 게르 방문', '', 'person', 5000, ''],
    ['entrance', '하라호린', '입장', '', 'person', 1000, ''],
    ['entrance', '하라호린', '박물관', '', 'person', 20000, ''],
    ['entrance', '쳉헤르 온천', '톨게이트', '', 'vehicle', 5000, ''],
    ['entrance', '에르덴트', '톨게이트', '', 'vehicle', 2000, ''],
    ['entrance', '홉스굴', '톨게이트', '', 'vehicle', 5000, ''],
    ['entrance', '홉스굴', '입장', '', 'person', 3000, ''],
    ['activity', '홉스굴', '보트', '', 'person', 50000, ''],
    ['activity', '홉스굴', '승마', '', 'person', 25000, '고객 2명당 마부 1명분 추가'],
    ['activity', '홉스굴', '순록 체험', '', 'person', 10000, ''],
    ['entrance', '차강소브라가', '톨게이트', '', 'vehicle', 3000, ''],
    ['entrance', '차강소브라가', '입장', '', 'person', 20000, ''],
    ['entrance', '욜린암·달란자드가드', '톨게이트', '', 'vehicle', 2000, ''],
    ['entrance', '욜린암·달란자드가드', '자연 입장', '', 'person', 10000, ''],
    ['activity', '욜린암·달란자드가드', '승마', '', 'person', 25000, '고객 2명당 마부 1명분 추가'],
    ['entrance', '홍고린엘스', '입장', '', 'person', 10000, ''],
    ['entrance', '바양작', '입장', '', 'person', 10000, ''],
    ['entrance', '어르헝 폭포', '톨게이트', '', 'vehicle', 10000, ''],
    ['entrance', '호스타이', '국립공원 입장', '', 'person', 70000, ''],
    ['entrance', '호스타이', '몽골 노마딕 쇼', '', 'person', 160000, ''],
];

const MEALS: Row[] = [
    ['meal', '울란바타르', '현지식 (시내)', '', 'person', 40000, ''],
    ['meal', '지방', '현지식 (시내 외)', '', 'person', 30000, ''],
    ['meal', '울란바타르', '특식 — The Bull (샤브샤브)', '', 'person', 55000, ''],
    ['meal', '울란바타르', '특식 — 삼겹살', '', 'person', 50000, ''],
    ['meal', '날라이흐(테를지)', '특식 — 삼겹살하우스', '', 'person', 50000, ''],
    ['meal', '하라호린', '특식 — King', '', 'person', 50000, ''],
    ['meal', '테를지', '특식 — 허르헉', '', 'person', 47000, '견적 시트 값 (풀패키지 50,000)'],
    ['meal', '지방', '게르 조식 (조식 미포함 지역)', '', 'person', 40000, '테를지·미니사막 게르는 조식 포함 — 넣지 않음'],
    ['misc', '', '생수', '', 'person', 1000, '1병'],
    ['vehicle', '', '유류대 — 스타렉스', '', 'team', 500000, '견적 시트의 일정당 묶음 값 — 코스 거리에 따라 다름'],
];

export const PRICING_SEED: Row[] = [...STAY, ...FEES, ...MEALS];
