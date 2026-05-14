import { useNavigate } from 'react-router-dom';
import { MatIcon } from '../desktop-primitives/MatIcon';

interface QuickLinksRowProps {
    contentWidth?: number;
}

const ITEMS = [
    { id: 'tour', label: 'ツアー商品', sub: '全プラン一覧', icon: 'explore', path: '/products' },
    { id: 'mates', label: '同行者募集', sub: '仲間を探す', icon: 'group', path: '/travel-mates' },
    { id: 'review', label: '旅行レビュー', sub: '実際の声', icon: 'reviews', path: '/reviews' },
    { id: 'quote', label: 'お見積もり', sub: '1分でリクエスト', icon: 'edit_note', path: '/custom-estimate' },
    { id: 'wishlist', label: 'ウィッシュリスト', sub: '保存したツアー', icon: 'favorite', path: '/mypage/wishlist' },
    { id: 'support', label: 'サポート', sub: '24時間対応', icon: 'support_agent', path: '/faq' },
];

export function QuickLinksRowDesktop({ contentWidth = 1280 }: QuickLinksRowProps) {
    const navigate = useNavigate();
    return (
        <section style={{ maxWidth: contentWidth, margin: '0 auto', padding: '48px 32px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
                {ITEMS.map((it) => (
                    <button
                        key={it.id}
                        type="button"
                        onClick={() => navigate(it.path)}
                        style={{
                            background: '#fff',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 20,
                            padding: '20px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            cursor: 'pointer',
                            textAlign: 'left',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            transition: 'all 200ms',
                            fontFamily: 'inherit',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 8px 22px rgba(0,0,0,0.08)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                            e.currentTarget.style.transform = '';
                        }}
                    >
                        <div
                            style={{
                                width: 52,
                                height: 52,
                                borderRadius: 16,
                                background: 'var(--primary-tint)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <MatIcon name={it.icon} size={26} color="#0f766e" />
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)', lineHeight: 1.3 }}>{it.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--fg-5)', marginTop: 3 }}>{it.sub}</div>
                        </div>
                    </button>
                ))}
            </div>
        </section>
    );
}
