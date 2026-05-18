import { useNavigate } from 'react-router-dom';

// 3D plasticine icons — same asset family the mobile QuickLinks uses, but
// rendered larger on PC to match the Yanolja-style reference (vertical card,
// big colorful icon on top, short label underneath).
import productsIcon from '../../assets/products_icon_v2.png';
import companionIcon from '../../assets/companion_search_icon_v2.png';
import reviewsIcon from '../../assets/my_reviews.png';
import estimateIcon from '../../assets/custom_estimate_icon_v2.png';
import wishlistIcon from '../../assets/wishlist_icon.png';
import supportIcon from '../../assets/icons/support.png';

interface QuickLinksRowProps {
    contentWidth?: number;
}

interface QuickItem {
    id: string;
    label: string;
    sub: string;
    img: string;
    path: string;
}

const ITEMS: QuickItem[] = [
    { id: 'tour', label: 'ツアー商品', sub: '全プラン一覧', img: productsIcon, path: '/products' },
    { id: 'mates', label: '同行者募集', sub: '仲間を探す', img: companionIcon, path: '/travel-mates' },
    { id: 'review', label: '旅行レビュー', sub: '実際の声', img: reviewsIcon, path: '/reviews' },
    { id: 'quote', label: 'お見積もり', sub: '1分でリクエスト', img: estimateIcon, path: '/custom-estimate' },
    { id: 'wishlist', label: 'ウィッシュリスト', sub: '保存したツアー', img: wishlistIcon, path: '/mypage/wishlist' },
    { id: 'support', label: 'サポート', sub: '24時間対応', img: supportIcon, path: '/faq' },
];

export function QuickLinksRowDesktop({ contentWidth = 1280 }: QuickLinksRowProps) {
    const navigate = useNavigate();
    return (
        <section style={{ maxWidth: contentWidth, margin: '0 auto', padding: '40px 32px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
                {ITEMS.map((it) => (
                    <button
                        key={it.id}
                        type="button"
                        onClick={() => navigate(it.path)}
                        style={{
                            background: '#fff',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 20,
                            padding: '22px 14px 18px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 12,
                            cursor: 'pointer',
                            textAlign: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            transition: 'all 220ms var(--ease-out, ease-out)',
                            fontFamily: 'inherit',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 12px 28px -8px rgba(0,0,0,0.12)';
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.borderColor = 'var(--border, #e2e8f0)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                            e.currentTarget.style.transform = '';
                            e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        }}
                    >
                        <div
                            style={{
                                width: 84,
                                height: 84,
                                borderRadius: 999,
                                background: '#f1f4f8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.03)',
                            }}
                        >
                            <img
                                src={it.img}
                                alt=""
                                aria-hidden="true"
                                loading="lazy"
                                decoding="async"
                                style={{
                                    width: 56,
                                    height: 56,
                                    objectFit: 'contain',
                                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))',
                                }}
                            />
                        </div>
                        <div>
                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: 'var(--fg-1)',
                                    lineHeight: 1.3,
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                {it.label}
                            </div>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: 'var(--fg-5)',
                                    marginTop: 4,
                                    fontWeight: 500,
                                }}
                            >
                                {it.sub}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </section>
    );
}
