import iconMates from '../../assets/mobile/my-icons/mates.webp';
import iconQuotes from '../../assets/mobile/my-icons/quotes.webp';
import iconWish from '../../assets/mobile/my-icons/wish.webp';
import iconRecent from '../../assets/mobile/my-icons/recent.webp';
import iconReviews from '../../assets/mobile/my-icons/reviews.webp';
import iconFaq from '../../assets/mobile/my-icons/faq.webp';
import iconContact from '../../assets/mobile/my-icons/contact.webp';

/** Rows whose badge shows a live count from the my page data. */
export type MyCountKey = 'mates' | 'quotes' | 'wish' | 'recent' | 'reviews';

export interface MyMenuItem {
    key: string;
    label: string;
    sub?: string;
    path: string;
    icon: string;
    count?: MyCountKey;
}

/** The three menu cards of the mobile my page (3D icons from the design, shown at 44px). */
export const MY_MENU: Array<{ title: string; items: MyMenuItem[] }> = [
    {
        title: '私のアクティビティ',
        items: [
            { key: 'mates', label: '同行者募集の投稿', sub: '登録された投稿を確認', path: '/mypage/travel-mates', icon: iconMates, count: 'mates' },
            { key: 'quotes', label: '見積もり履歴', sub: '送信したリクエストと回答', path: '/mypage/estimates', icon: iconQuotes, count: 'quotes' },
        ],
    },
    {
        title: 'ウィッシュリスト',
        items: [
            { key: 'wish', label: '気になった商品', path: '/mypage/wishlist', icon: iconWish, count: 'wish' },
            { key: 'recent', label: '最近見た商品', path: '/mypage/recently-viewed', icon: iconRecent, count: 'recent' },
            { key: 'reviews', label: 'MYレビュー', path: '/mypage/reviews', icon: iconReviews, count: 'reviews' },
        ],
    },
    {
        title: 'カスタマーサポート',
        items: [
            { key: 'faq', label: 'FAQ', sub: 'よくあるご質問', path: '/faq', icon: iconFaq },
            { key: 'contact', label: 'お問い合わせ', sub: 'LINE・メールで日本語対応', path: '/contact', icon: iconContact },
        ],
    },
];
