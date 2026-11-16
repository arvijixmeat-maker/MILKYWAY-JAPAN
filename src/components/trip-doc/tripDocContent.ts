/**
 * 견적서·확정일정표 공통 문구 (디자인 시안 「Japan version」 그대로) — 모든 고객 문서에 같은 내용.
 * 회사 소개·숙소 기준·팀·식사 약속·안전 수칙·공항 미팅·인허가처럼 고객마다 바뀌지 않는 부분.
 */

export const C = {
    ink: '#123B3A',
    mint: '#00A88B',
    mintDeep: '#007F75',
    mintBright: '#06C4A0',
    mintSoft: '#6CE3CC',
    mintPale: '#8CE9D8',
    mintBg: '#E8FAF5',
    mintLine: '#BFF1E7',
    paper: '#F7FAF9',
    gray: '#F0F5F4',
    line: '#DDEBE7',
    sub: '#5F7674',
    body: '#3F5856',
    mute: '#8A9E9B',
    faint: '#B6C7C3',
    red: '#E5484D',
    grad: 'linear-gradient(160deg,#007F75 0%,#06C4A0 100%)',
    gradText: 'linear-gradient(165deg,#007F75 0%,#06C4A0 60%,#6CE3CC 100%)',
};

export const COMPANY = {
    mnRegNo: '9011640064',
    mnRegName: 'SUUNZAM',
    krRegNo: '730-54-00614',
    krRegName: 'HELLO BOLA',
    instagram: 'mongolia_inhasu',
    site: 'mongolryokou.com',
};

/** 숙소 비교 — [항목, [텐트, 유목민 게르, 스탠다드 게르, 고급 게르]] */
export const STAY_ROWS: Array<[string, [string, string, string, string]]> = [
    ['電気', ['電気使用不可', '電気使用に制限あり', '電気使用可', '電気使用可']],
    ['トイレ', ['汲み取り式トイレ', '共用トイレ', '共用トイレ', 'ゲル内にトイレ完備']],
    ['洗面・シャワー', ['洗面・シャワー設備なし', '洗面・シャワー設備なし', '共用シャワー・洗面台', 'ゲル内に完備']],
    ['Wi-Fi', ['使用不可', '使用不可', 'キャンプ内で使用可', 'キャンプ内で使用可']],
    ['暖房', ['ストーブ暖房なし', 'ゲル内の薪ストーブ', 'ゲル内の薪ストーブ', '床暖房 or 電気ストーブ']],
];
export const BAD_STAY = /不可|なし|制限|汲み取り/;

const I_ELEC = 'M13 2L4 14h7l-1 8 9-12h-7z';
const I_TOILET = 'M6 3h8v6H6zM4 9h12v4a5 5 0 01-5 5H9a5 5 0 01-5-5zM9 18v3';
const I_SHOWER = 'M12 3c3 4 6 7.5 6 11a6 6 0 01-12 0c0-3.5 3-7 6-11z';
const I_HEAT = 'M12 22c4 0 7-2.7 7-6.5 0-3-2-5-3-7-1 2-2 3-3 3 0-3-1-6-4-9 0 4-4 7-4 13 0 3.8 3 6.5 7 6.5z';

/** 숙소 슬라이드 (스탠다드 / 고급) */
export const STAY_FILM: Array<{ slot: string; name: string; en: string; sub: string; items: Array<[string, string, string]> }> = [
    { slot: 'quote-stay-ger', name: 'スタンダードゲル', en: 'Standard Ger', sub: 'スタンダード', items: [[I_ELEC, '電気', '使用可'], [I_TOILET, 'トイレ', '共用'], [I_SHOWER, 'シャワー', '共用 · 洗面台'], [I_HEAT, '暖房', '薪ストーブ']] },
    { slot: 'quote-stay-lux', name: '高級ゲル', en: 'Premium Ger', sub: '今回のご宿泊', items: [[I_ELEC, '電気', '使用可'], [I_TOILET, 'トイレ', 'ゲル内'], [I_SHOWER, 'シャワー', 'ゲル内'], [I_HEAT, '暖房', '床暖房 · 電気ストーブ']] },
];

export const STAY_SELECT = [
    { t: 'モンゴル現地のチームが直接キャンプを訪れ、下見をしたうえで選定します。', icon: 'M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z' },
    { t: '清潔さ・設備の状態・運営状況を社内基準に沿って確認します。', icon: 'M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9' },
    { t: '毎年の下見と旅行者の満足度を反映し、新しいキャンプを中心に厳選します。', icon: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z' },
];

export const STAY_TILES_TOP = [['stay-tile-1', 200], ['stay-tile-2', 120], ['stay-tile-3', 220], ['stay-tile-8', 140]] as const;
export const STAY_TILES_BOTTOM = [['stay-tile-4', 120], ['stay-tile-5', 240], ['stay-tile-6', 130], ['stay-tile-7', 170]] as const;

export const TEAM = [
    {
        role: 'ガイド', en: 'GUIDE', dark: true,
        icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4.4 3.6-8 8-8s8 3.6 8 8M17 4.5l1.5 1.5L21 3.5',
        lines: [['全日程に日本語専門ガイドが同行します。', '専門ガイド資格教育を修了した確かなプロです。'], ['経験豊富なスタッフが', '言葉の心配なく旅をサポートします。']],
    },
    {
        role: 'ドライバー', en: 'DRIVER', dark: false,
        icon: 'M3 13l2-6h14l2 6v5H3zM3 13h18M7 18v2M17 18v2M7 15.5h.01M17 15.5h.01',
        lines: [['道も標識もないモンゴルの荒れた未舗装路でも迷わず最適な道を見つけ、', 'オフロードも安心・安全に運行します。'], ['走行中の突発的な状況にも慌てず、その場ですぐに車両を', '整備できる技術を備えています。'], ['出発前の総合点検から洗車まで、厳格な社内マニュアルに沿って', '万全の車両コンディションを保ちます。']],
    },
];

export const TEAM_ASSIGN = [
    { big: '2〜4名', area: '中部ツアー', who: 'ドライビングガイド 1名' },
    { big: '5名+', area: '中部ツアー', who: 'ガイド + ドライバー' },
    { big: '人数問わず', area: 'ゴビ · フブスグル', who: 'ガイド + ドライバー (2名1組)' },
];

/** 원형 7개 배치 [x%, y%, size%] */
export const ORBIT_POS: Array<[number, number, number]> = [[12, 80, 18], [13, 47, 18], [26, 20, 18], [50, 14, 19], [74, 20, 18], [87, 47, 18], [88, 80, 18]];

export const ACT_RULES: Array<[string, boolean]> = [
    ['アクティビティへの参加は自由にお決めいただけます。ご希望でない場合は事前にガイドへお伝えください。', false],
    ['ガイドの案内に従わずに発生した事故については、旅行会社は責任を負いかねます。', true],
    ['体験中の事故に備え、必ず海外旅行保険にご加入ください。', false],
];

export const RIDE_TIPS = [
    '乗馬やラクダに乗るときは、必ず左側から乗ります。モンゴルの馬は人が左側から近づくよう訓練されており、反対側から近づくと驚いて嫌がることがあります。',
    '馬は生まれつき臆病な動物のため、馬のそばで驚いたり大きな声を出したりすると危険です。',
    '馬の後ろから近づいたり後ろに立ったりしないでください。常に2m以上離れてください。後ろから近づくと脅威と感じて蹴ることがあります。',
];

export const CERTS = [
    { slot: 'quote-cert-1', t: '現地旅行業許可証', d: 'モンゴル政府に正式登録された現地旅行会社' },
    { slot: 'quote-cert-2', t: '現地旅行業許可証', d: 'モンゴル旅行協会（MATA）正式登録' },
    { slot: 'quote-cert-3', t: '現地旅行業許可証', d: 'モンゴル現地法人 設立済み' },
    { slot: 'quote-cert-4', t: '韓国 事業者登録証', d: '韓国にて正式に事業者登録' },
    { slot: 'quote-cert-5', t: '韓国 通信販売業申告証', d: 'オンライン販売の正式申告済み' },
    { slot: 'quote-cert-6', t: '中小企業確認書', d: '中小ベンチャー企業部の確認企業' },
];
export const CERT_TAGS = ['事業者登録', '観光事業登録', '旅行業保証保険', '現地法人設立', 'MATA 正式登録'];

/** 아이콘 path */
export const IC = {
    check: 'M5 12l5 5 9-10',
    x: 'M7 7l10 10M17 7L7 17',
    shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6zM9 12l2 2 4-4',
    pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
    chev: 'M6 9l6 6 6-6',
    left: 'M15 5l-7 7 7 7',
    right: 'M9 5l7 7-7 7',
    info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 8h.01M11 12h1v4h1',
    card: 'M4 7h16v11H4zM4 11h16M8 15h3',
    plus: 'M12 5v14M5 12h14',
    memo: 'M5 4h14v16H5zM9 9h6M9 13h6M9 17h3',
    home: 'M3 20V10l9-6 9 6v10M9 20v-6h6v6',
    fork: 'M7 3v8a3 3 0 006 0V3M10 3v18M17 3c-1.7 0-3 2.2-3 5s1.3 4 3 4v9',
    horse: 'M5 20v-5l3-6 4-2 3 2 2 5-2 1-2-3-2 2v6M14 5l2-2',
    camel: 'M3 20v-6l2-4h3l2-3 2 3h2l2-3 2 3 3 2v8M8 20v-4M16 20v-4',
    doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
    chat: 'M12 4C7 4 3 7.1 3 11c0 2.4 1.6 4.6 4 5.8L6 20l3.6-2.2c.8.1 1.6.2 2.4.2 5 0 9-3.1 9-7s-4-7-9-7z',
    insta: 'M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4zM12 16a4 4 0 100-8 4 4 0 000 8zM17.5 6.5h.01',
    arrowUp: 'M7 17L17 7M9 7h8v8',
    warn: 'M12 7v6M12 17h.01',
    print: 'M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z',
};
