import heroImg from '../../assets/about/about-hero.webp';
import nightImg from '../../assets/about/about-night.webp';
import point1Img from '../../assets/about/about-point-1.webp';
import point2Img from '../../assets/about/about-point-2.webp';
import point3Img from '../../assets/about/about-point-3.webp';
import team1Img from '../../assets/about/about-team-1.webp';
import team2Img from '../../assets/about/about-team-2.webp';
import team3Img from '../../assets/about/about-team-3.webp';

/**
 * 会社案内 (/about) — copy and data shared by the PC and mobile screens.
 * The Japanese text is the owner's company introduction, kept verbatim from the
 * Claude Design source; do not reword it.
 */

export interface AboutImage {
    src: string;
    alt: string;
    /** Intrinsic size of the file, so the browser can reserve the box before it loads. */
    width: number;
    height: number;
}

export const ABOUT_HERO_IMAGE: AboutImage = {
    src: heroImg,
    alt: 'チンギス・ハーン騎馬像の前でポーズをとるモンゴル旅行の参加者たち',
    width: 680,
    height: 382,
};

export const ABOUT_BAND_IMAGE: AboutImage = {
    src: nightImg,
    alt: 'モンゴルの草原と森に並ぶ伝統住居ゲル',
    width: 1200,
    height: 801,
};

export const ABOUT_COPY = {
    heroEyebrow: 'ABOUT US',
    heroLines: ['モンゴル現地の旅行会社', '「モンゴリア天の川」'],
    scrollHint: 'SCROLL',
    kicker: 'モンゴル現地の旅行会社',
    philosophyGhost: 'PHILOSOPHY',
    philosophyTitle: '#旅行理念は？',
    philosophyBody: [
        '単なる観光ではなく、モンゴルの大自然と全身でコミュニケーションする特別な体験をご提供します。',
        '疲れた日常から抜け出し、モンゴルの自然の中で新しい自我を発見できるようにお手伝いします。',
    ],
    bandText:
        '現地人だけが知っている最もモンゴルらしい旅行場所と旅行パッケージと日本人旅行客の情緒に合わせた旅行日程でどこでもない構成で旅行を提供しています。',
    valuesTitle: '#旅行の価値観は？',
    valuesBody: '旅行者の安全と利便性を最優先に考え、旅行者の最上の満足度のために最善を尽くして努力します。',
    promiseEyebrow: 'OUR PROMISE',
    promiseTitle: '私たちの3つのこだわり',
    ctaEyebrow: 'CUSTOM TOUR',
    /** One entry per phrase, so a narrow box breaks the heading at the comma. */
    ctaTitle: ['あなただけのモンゴル旅行を、', '現地スタッフと'],
    ctaQuote: 'お見積もり',
    ctaTours: 'ツアー商品を見る',
    ctaLine: 'LINEで相談',
} as const;

/** Decorative words of the flowing band under the hero (hidden from assistive tech). */
export const ABOUT_MARQUEE = ['MONGOLIA', 'MILKY WAY', 'NOMAD', 'STEPPE', 'GOBI', 'STARLIGHT'] as const;

export interface AboutMember {
    no: string;
    name: string;
    role: string;
    image: AboutImage;
}

export const ABOUT_TEAM: AboutMember[] = [
    { no: '01', name: 'Bilguun', role: '代表', image: { src: team1Img, alt: '代表 Bilguun', width: 776, height: 764 } },
    { no: '02', name: 'Gantuu', role: '副代表', image: { src: team2Img, alt: '副代表 Gantuu', width: 768, height: 776 } },
    { no: '03', name: 'Bolor', role: '旅行デザイナー', image: { src: team3Img, alt: '旅行デザイナー Bolor', width: 776, height: 437 } },
];

export interface AboutPoint {
    no: string;
    /** Heading, one entry per rising line. */
    title: string[];
    body: string[];
    image: AboutImage;
    /** PC: photo on the right, wiped in from the right edge. */
    flip: boolean;
}

export const ABOUT_POINTS: AboutPoint[] = [
    {
        no: '01',
        title: ['モンゴル旅行パッケージは', 'モンゴル人が計画しなければなりません。'],
        body: [
            'うちの旅行社は韓国でホテル経営学科を卒業してモンゴルに住んでいる代表と副代表で構成された家族が設立したモンゴル旅行会社です！',
            '現地人だけが知っている最もモンゴルらしい旅行場所と日本人旅行客の情緒に合わせた旅行日程でどこにもない構成で旅行を計画します。',
        ],
        image: { src: point1Img, alt: 'モンゴルの草原で乗馬ツアーを楽しむ旅行者たち', width: 1080, height: 1080 },
        flip: false,
    },
    {
        no: '02',
        title: ['リーズナブルな価格が一番重要です。'],
        body: [
            '現地の人だけが運営する旅行会社なので大手旅行会社の中間流通過程を省略して旅行者の不必要な手数料負担を下げました。',
            '旅行は旅行であるだけで、NOショッピング、NOオプション、旅行中に追加で発生するオプション費用はありません。',
        ],
        image: { src: point2Img, alt: '旅行費用を電卓で計算している様子', width: 1128, height: 752 },
        flip: true,
    },
    {
        no: '03',
        title: ['モンゴル旅行について', '固定観念を打ち破ります。'],
        body: [
            '遊牧民と馬乗り！伝統家屋ゲル！このすべてを体験しながら！ホカンスまですべて可能です！',
            '伝統ゲル体験ときれいでクオリティのある宿泊施設と快適な車とさっぱりとしておいしい店を中心に旅行することになります！',
        ],
        image: { src: point3Img, alt: '清潔で広々としたホテルの客室', width: 1128, height: 750 },
        flip: false,
    },
];

export interface AboutStar {
    left: number;
    top: number;
    size: number;
    /** Twinkle duration / start offset in seconds. */
    duration: number;
    delay: number;
}

/** The 16 twinkling dots over the hero photo (same positions and timing as the design). */
export const ABOUT_STARS: AboutStar[] = Array.from({ length: 16 }, (_, i) => ({
    left: (11 + i * 37) % 100,
    top: (7 + i * 53) % 70,
    size: 2 + (i % 3),
    duration: 2.4 + (i % 4) * 0.7,
    delay: Number((i * 0.37).toFixed(2)),
}));
