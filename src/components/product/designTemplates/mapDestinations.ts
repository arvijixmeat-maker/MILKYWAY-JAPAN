/**
 * 여정 지도(public/designs/mongolia-map.html)가 좌표를 알고 있는 여행지 목록.
 * ko는 지도 가제티어(GAZETTEER) 키와 일치해야 한다 — 이름만으로 지도에 자동 표시된다.
 * ja는 지도 말풍선에 표시되는 일본어 라벨 기본값.
 * 지도에 새 지역을 추가하면 mongolia-map.html의 GAZETTEER에도 좌표를 등록할 것.
 */
export interface MapDestination {
    ko: string;
    /** 운영 페이지(일본어)에 표시되는 공식 일본어 표기 */
    ja: string;
    /** 영어 표기 — 관리자가 영어로 고를 때 쓰는 라벨 */
    en: string;
    group: string;
}

export const MAP_DESTINATIONS: MapDestination[] = [
    // ── 울란바토르 근교 ──
    { ko: '울란바토르', ja: 'ウランバートル', en: 'Ulaanbaatar', group: '울란바토르 근교' },
    { ko: '칭기스칸공항', ja: 'チンギスハーン国際空港', en: 'Chinggis Khaan Airport', group: '울란바토르 근교' },
    { ko: '촌진볼독', ja: 'チンギスハーン騎馬像', en: 'Chinggis Khaan Statue (Tsonjin Boldog)', group: '울란바토르 근교' },
    { ko: '테를지 국립공원', ja: 'テレルジ国立公園', en: 'Terelj National Park', group: '울란바토르 근교' },
    { ko: '거북바위', ja: '亀岩', en: 'Turtle Rock', group: '울란바토르 근교' },
    { ko: '아리야발사원', ja: 'アリヤバル寺院', en: 'Aryabal Monastery', group: '울란바토르 근교' },
    { ko: '만주시리', ja: 'マンズシル寺院', en: 'Manzushir Monastery', group: '울란바토르 근교' },
    { ko: '후스타이', ja: 'フスタイ国立公園', en: 'Hustai National Park', group: '울란바토르 근교' },
    { ko: '자이산', ja: 'ザイサンの丘', en: 'Zaisan Hill', group: '울란바토르 근교' },
    { ko: '간단사원', ja: 'ガンダン寺', en: 'Gandan Monastery', group: '울란바토르 근교' },
    { ko: '수흐바타르광장', ja: 'スフバートル広場', en: 'Sukhbaatar Square', group: '울란바토르 근교' },
    { ko: '복드칸궁전', ja: 'ボグドハーン宮殿博物館', en: 'Bogd Khan Palace Museum', group: '울란바토르 근교' },
    { ko: '국립백화점', ja: '国営百貨店', en: 'State Department Store', group: '울란바토르 근교' },
    // ── 중앙몽골 ──
    { ko: '엘승타사르해', ja: 'エルセンタサルハイ', en: 'Elsen Tasarkhai (Mini Gobi)', group: '중앙몽골' },
    { ko: '카라코룸', ja: 'カラコルム', en: 'Kharkhorin (Karakorum)', group: '중앙몽골' },
    { ko: '에르덴조', ja: 'エルデネゾー寺院', en: 'Erdene Zuu Monastery', group: '중앙몽골' },
    { ko: '어기호수', ja: 'オギー湖', en: 'Ugii Lake', group: '중앙몽골' },
    { ko: '체체를렉', ja: 'ツェツェルレグ', en: 'Tsetserleg', group: '중앙몽골' },
    { ko: '쳉헤르 온천', ja: 'ツェンヘル温泉', en: 'Tsenkher Hot Springs', group: '중앙몽골' },
    { ko: '타이하르촐로', ja: 'タイハルチョロー', en: 'Taikhar Chuluu', group: '중앙몽골' },
    { ko: '테르힝차강', ja: 'テルヒーンツァガーン湖', en: 'Terkhiin Tsagaan Lake', group: '중앙몽골' },
    { ko: '호르고', ja: 'ホルゴ火山', en: 'Khorgo Volcano', group: '중앙몽골' },
    { ko: '어르헝폭포', ja: 'オルホン滝', en: 'Orkhon Waterfall', group: '중앙몽골' },
    { ko: '톱흥사원', ja: 'トゥブフン寺院', en: 'Tuvkhun Monastery', group: '중앙몽골' },
    // ── 북부 ──
    { ko: '홉스굴', ja: 'フブスグル湖', en: 'Khuvsgul Lake', group: '북부' },
    { ko: '하트갈', ja: 'ハトガル', en: 'Khatgal', group: '북부' },
    { ko: '무릉', ja: 'ムルン', en: 'Murun', group: '북부' },
    { ko: '아마르바야스갈란트', ja: 'アマルバヤスガラント寺院', en: 'Amarbayasgalant Monastery', group: '북부' },
    { ko: '다르항', ja: 'ダルハン', en: 'Darkhan', group: '북부' },
    { ko: '에르데넷', ja: 'エルデネト', en: 'Erdenet', group: '북부' },
    // ── 고비 ──
    { ko: '바가가즈링촐로', ja: 'バガガズリンチョロー', en: 'Baga Gazriin Chuluu', group: '고비' },
    { ko: '만들고비', ja: 'マンダルゴビ', en: 'Mandalgovi', group: '고비' },
    { ko: '옹기사원', ja: 'オンギ寺院', en: 'Ongi Monastery', group: '고비' },
    { ko: '차강소브라가', ja: 'ツァガーンスワルガ', en: 'Tsagaan Suvarga', group: '고비' },
    { ko: '달란자드가드', ja: 'ダランザドガド', en: 'Dalanzadgad', group: '고비' },
    { ko: '욜링암', ja: 'ヨリンアム', en: 'Yolyn Am', group: '고비' },
    { ko: '바양작', ja: 'バヤンザグ', en: 'Bayanzag (Flaming Cliffs)', group: '고비' },
    { ko: '홍고린엘스', ja: 'ホンゴリンエルス', en: 'Khongoryn Els', group: '고비' },
    { ko: '고비사막', ja: 'ゴビ砂漠', en: 'Gobi Desert', group: '고비' },
    { ko: '사인샨드', ja: 'サインシャンド', en: 'Sainshand', group: '고비' },
    { ko: '하마린사원', ja: 'ハマリン寺院', en: 'Khamaryn Monastery', group: '고비' },
    // ── 서부 ──
    { ko: '홉드', ja: 'ホブド', en: 'Khovd', group: '서부' },
    { ko: '울기', ja: 'ウルギー', en: 'Ulgii', group: '서부' },
    { ko: '타왕복드', ja: 'タワンボグド', en: 'Tavan Bogd', group: '서부' },
];

/**
 * 영어/한국어/일본어 어느 표기로 들어와도 공식 일본어 표기로 바꿔 준다.
 * 목록에 없는 이름은 그대로 돌려준다 (직접 입력한 일본어 등).
 */
export function toJaDestinationName(name: string): string {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    if (!key) return name;
    const hit = MAP_DESTINATIONS.find(d =>
        d.en.toLowerCase() === key
        || d.ko === trimmed
        || d.ja === trimmed
        // 괄호 보조 표기 없이 입력해도 매칭 (예: "Bayanzag" ↔ "Bayanzag (Flaming Cliffs)")
        || d.en.toLowerCase().replace(/\s*\(.*\)$/, '') === key,
    );
    return hit ? hit.ja : name;
}
