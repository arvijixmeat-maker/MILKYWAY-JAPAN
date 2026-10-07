/**
 * The six ご利用案内 / 会社情報 pages that share the Info layout
 * (Claude Design: "Info Header" + "Info Nav"). Order = navigation order.
 */

export type InfoKey = 'bookingFlow' | 'faqList' | 'termsDoc' | 'privacyDoc' | 'guideRecruit' | 'contactUs';

export const INFO_GROUPS = ['ご利用案内', '会社情報'] as const;
export type InfoGroup = (typeof INFO_GROUPS)[number];

export interface InfoEntry {
    key: InfoKey;
    path: string;
    group: InfoGroup;
    /** English eyebrow above the title. */
    en: string;
    title: string;
    lead: string;
}

export const INFO_PAGES: InfoEntry[] = [
    { key: 'bookingFlow', path: '/booking-flow', group: 'ご利用案内', en: 'BOOKING FLOW', title: 'ご予約の流れ', lead: 'お問い合わせからご出発まで、日本語スタッフがサポートします。' },
    { key: 'faqList', path: '/faq', group: 'ご利用案内', en: 'FAQ', title: 'よくある質問', lead: 'お客様からよくいただくご質問をまとめました。' },
    { key: 'termsDoc', path: '/terms-of-service', group: 'ご利用案内', en: 'TERMS OF SERVICE', title: '利用規約', lead: 'Milkyway Japanのサービスをご利用いただく際の規約です。' },
    { key: 'privacyDoc', path: '/privacy-policy', group: 'ご利用案内', en: 'PRIVACY POLICY', title: 'プライバシーポリシー', lead: 'お客様の個人情報の取り扱いについてご案内します。' },
    { key: 'guideRecruit', path: '/guide-apply', group: '会社情報', en: 'RECRUIT', title: 'ガイド募集', lead: 'モンゴル旅行の公認ガイドとして登録申請ができます。' },
    { key: 'contactUs', path: '/contact', group: '会社情報', en: 'CONTACT', title: 'お問い合わせ', lead: 'ご旅行のご相談・ご質問はお気軽にどうぞ。日本語スタッフが24時間以内にご返信します。' },
];

export const infoEntry = (key: InfoKey): InfoEntry => INFO_PAGES.find((p) => p.key === key) ?? INFO_PAGES[0];

/** The entry whose route matches the current location; falls back to the page's own key. */
export const activeInfoKey = (pathname: string, fallback: InfoKey): InfoKey => {
    const path = pathname.replace(/\/+$/, '') || '/';
    return INFO_PAGES.find((p) => p.path === path)?.key ?? fallback;
};
