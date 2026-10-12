// Milkyway Japan — company-wide constants used in legal documents.
// Change here to update across all contracts.

export const COMPANY_INFO = {
    nameJa: 'モンゴル銀河旅行社',
    nameEn: 'Milkyway Japan',
    nameLegal: 'Mongolia Milky Way（SUUN ZAM）',  // 商号（登録名）
    phoneKR: '+976-9594-5838',
    phoneMGL: '976-9594-5838',
    phoneSecondary: '+976-8010-7766',     // 現地オフィス第2連絡先
    representative: 'DAVAASUREN BOLOR',  // 担当者 (代理)
    ceo: 'DAVAASUREN BILGUUN',           // 代表者
    registrationNumber: '9011640064',     // 事業者登録番号
    tourRegistrationNumber: '6124313',    // 観光事業登録番号
    registrationNote: 'Сүүнзам трэйд',
    addressJa: 'ウランバートル市 バヤンズルフ区 DACOセンター 3階 306号室',
    email: 'info@mongolryokou.com',
    website: 'mongolryokou.com',
    stampImage: '/stamp.png',             // place the stamp image at public/stamp.png
};

// 在モンゴル日本国大使館 — 確定日程表の海外安全情報で使用
export const EMBASSY_INFO = {
    nameJa: '在モンゴル日本国大使館',
    addressJa: 'Olympic Street 19A, Sukhbaatar District, Ulaanbaatar 14241, Mongolia',
    phone: '+976-1132-1207',              // 代表電話
    emergencyPhone: '+976-9911-4119',     // 緊急（24時間）
};

// 現地緊急通報先 — モンゴル国内
export const LOCAL_EMERGENCY: Array<{ label: string; number: string }> = [
    { label: '警察', number: '102' },
    { label: '消防', number: '101' },
    { label: '救急車', number: '103' },
    { label: '災害・緊急', number: '105' },
];

/** 予約金は宿泊施設の前払金に充てるため、キャンセル時も返金しない（オーナー方針）。 */
export const DEPOSIT_POLICY = '予約金はホテルおよび宿泊施設の前払金として使用されるため、日程キャンセルの場合は全額返金不可となりますので、予めご了承ください。';

export interface CancellationRow {
    period: string;
    fee: string;
}

/**
 * 契約書のキャンセル規定（オーナー方針 2026-10）。予約金は宿泊施設の前払金のため返金不可、
 * 残金は現地でお支払いいただくため、旅行開始前のキャンセルでは発生しない。
 */
export const CONTRACT_CANCELLATION_ROWS: CancellationRow[] = [
    { period: '予約金', fee: 'キャンセルの時期にかかわらず返金不可' },
    { period: '残金（現地払い）', fee: '旅行開始前のキャンセルの場合、お支払いは不要です' },
    { period: '旅行開始後のキャンセル・途中離団', fee: '返金はありません' },
];

/** Default tables earlier versions seeded templates with: the percentage table, then the one that still listed a bank-transferred balance. */
const LEGACY_CANCELLATION_TABLES: CancellationRow[][] = [
    [
        { period: '30日〜15日前まで', fee: '旅行代金の10%' },
        { period: '14日〜8日前まで', fee: '旅行代金の20%' },
        { period: '7日〜3日前まで', fee: '旅行代金の30%' },
        { period: '2日前〜当日', fee: '旅行代金の50%' },
        { period: '無連絡不参加', fee: '旅行代金の100%' },
    ],
    [
        { period: '予約金', fee: 'キャンセルの時期にかかわらず返金不可' },
        { period: '残金（現地払い）', fee: '旅行開始前のキャンセルの場合、お支払いは不要です' },
        { period: '残金（事前お振込み済み）', fee: '旅行開始前のキャンセルの場合、全額返金（振込手数料はお客様負担）' },
        { period: '旅行開始後のキャンセル・途中離団', fee: '返金はありません' },
    ],
];

/**
 * Saved templates carry a copy of whatever the default table was when they were saved.
 * An untouched copy of an earlier default table is replaced by the current rules; a table the
 * admin edited is kept as is.
 */
export const resolveCancellationRows = (rows: unknown): CancellationRow[] => {
    if (!Array.isArray(rows) || rows.length === 0) return CONTRACT_CANCELLATION_ROWS;
    const list = rows as CancellationRow[];
    const untouchedLegacy = LEGACY_CANCELLATION_TABLES.some((legacy) => list.length === legacy.length
        && list.every((r, i) => r?.period === legacy[i].period && r?.fee === legacy[i].fee));
    return untouchedLegacy ? CONTRACT_CANCELLATION_ROWS : list;
};

/**
 * 予約金のお支払い方法。予約金は PayPal でのみお受けし、銀行口座のご案内は行わない（オーナー方針 2026-10）。
 * Templates saved while the default was still a bank transfer fall back to it as well.
 */
export const DEPOSIT_PAYMENT_METHOD = 'PayPal';

export const resolveDepositMethod = (saved: unknown): string => {
    const value = typeof saved === 'string' ? saved.trim() : '';
    return !value || value === '銀行振込' ? DEPOSIT_PAYMENT_METHOD : value;
};

export const CONTRACT_NOTICES = [
    '旅行中にお客様自身の過失による事故が発生した場合、旅行会社には一切の責任および損害賠償責任がないことを予めご了承ください。',
    '旅行中は天候状況や都市の交通渋滞等により、パッケージ日程が変更となる場合がございます。その際は現地ガイドの判断によりご案内させていただきます。',
    '乗馬体験およびラクダ体験は各回1回ずつ含まれておりますが、追加で体験をご希望の場合は現地にて追加料金をお支払いいただくことでご利用いただけます。また、博物館や各種文化施設を追加でご利用される場合には、別途入場料が発生する場合がございます。',
    DEPOSIT_POLICY,
    '残金は現地にて日本円（現金）でお支払いくださいますようお願いいたします。',
];

export const PRIVACY_NOTICES = [
    '収集および利用目的：宿泊予約および予約金の現金領収書発行のため',
    '収集および利用項目：氏名、携帯電話番号',
    '保有および利用期間：処理完了後、3か月間保管',
    '個人情報の収集および利用にご同意いただいた場合に限り、連絡先をご記入ください。ご同意いただけない場合は連絡先の記入は不要ですが、その場合、現金領収書の発行はいたしかねます。',
];

export const OTHER_NOTICES = [
    '追加のご案内事項がある場合は、旅行者へ別途ご案内いたします。',
    '予約金のご入金をもって、本契約書は効力を生じます。',
    '追加オプション（エアベッド等）につきましては、事前にご予約可否をご確認のうえ、ご出発の7日前までにホームページ＞チェックポイント＞オプション商品よりお申込みいただき、あわせてご連絡くださいますようお願いいたします。',
];
