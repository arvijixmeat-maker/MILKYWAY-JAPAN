import { useNavigate } from 'react-router-dom';
import logoSquare from '../../assets/new_logo_2026.png';
import { MatIcon } from '../desktop-primitives/MatIcon';

interface DesktopFooterProps {
    contentWidth?: number;
}

interface FooterLink {
    label: string;
    path?: string;
    onClick?: () => void;
}

export function DesktopFooter({ contentWidth = 1280 }: DesktopFooterProps) {
    const navigate = useNavigate();

    const onConsult = () => {
        if (typeof window.openChannelTalk === 'function') {
            window.openChannelTalk();
        } else {
            navigate('/custom-estimate');
        }
    };

    const cols: { h: string; items: FooterLink[] }[] = [
        {
            h: 'サービス',
            items: [
                { label: 'モンゴル旅行ガイド', path: '/travel-guide' },
                { label: 'モンゴルツアー商品一覧', path: '/products' },
                { label: 'モンゴル乗馬旅行', path: '/category/horse-riding-tour' },
                { label: 'ゴビ砂漠ツアー', path: '/category/gobi-desert' },
                { label: '同行者を探す', path: '/travel-mates' },
                { label: 'お見積もりリクエスト', path: '/custom-estimate' },
            ],
        },
        {
            h: 'ご利用案内',
            items: [
                { label: 'ご予約の流れ', path: '/about' },
                { label: 'よくある質問 (FAQ)', path: '/faq' },
                { label: '利用規約', path: '/terms-of-service' },
                { label: 'プライバシーポリシー', path: '/privacy-policy' },
                { label: 'ご予約状況の確認', path: '/reservation-status' },
            ],
        },
        {
            h: '会社情報',
            items: [
                { label: '会社案内', path: '/about' },
                { label: 'ガイド募集', path: '/guide-apply' },
                { label: 'お客様のレビュー', path: '/reviews' },
                { label: 'マイページ', path: '/mypage' },
                { label: 'お問い合わせ', onClick: onConsult },
            ],
        },
    ];

    return (
        <footer style={{ background: 'var(--bg-muted)', borderTop: '1px solid var(--border-subtle)', color: 'var(--fg-4)' }}>
            {/* CTA strip */}
            <div style={{ background: 'var(--fg-1)', color: '#cbd5e1' }}>
                <div
                    style={{
                        maxWidth: contentWidth,
                        margin: '0 auto',
                        padding: '36px 32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 24,
                        flexWrap: 'wrap',
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 13,
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                color: '#5eead4',
                                textTransform: 'uppercase',
                                marginBottom: 6,
                            }}
                        >
                            Custom Tour
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                            あなただけの特別なプランを、1分でリクエスト
                        </div>
                        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>
                            日本語スタッフが24時間以内にご返信。お見積もりは無料です。
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            type="button"
                            onClick={() => navigate('/custom-estimate')}
                            style={{
                                padding: '14px 22px',
                                background: '#0f766e',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 999,
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            <MatIcon name="edit_note" size={18} color="#fff" /> お見積もり
                        </button>
                        <button
                            type="button"
                            onClick={onConsult}
                            style={{
                                padding: '14px 22px',
                                background: 'transparent',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.25)',
                                borderRadius: 999,
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            <MatIcon name="chat" size={18} color="#fff" /> 相談
                        </button>
                    </div>
                </div>
            </div>

            <div
                style={{
                    maxWidth: contentWidth,
                    margin: '0 auto',
                    padding: '56px 32px 32px',
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
                    gap: 56,
                }}
            >
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <img src={logoSquare} alt="" style={{ height: 44, width: 44, objectFit: 'contain' }} />
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)' }}>Milkyway Japan</div>
                            <div style={{ fontSize: 11, color: 'var(--fg-5)', marginTop: 2 }}>Mongolia Milky Way (SUUN ZAM)</div>
                        </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-4)', lineHeight: 1.75 }}>
                        モンゴル旅行・モンゴルツアー専門の現地旅行社です。日本語堪能な専門ガイドが同行し、安心・安全なご旅行をご提案します。
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                        {[
                            { icon: 'photo_camera', label: 'Instagram', href: 'https://instagram.com' },
                            { icon: 'chat', label: 'LINE', onClick: onConsult },
                            { icon: 'mail', label: 'Email', href: 'mailto:bolor1@hanmail.net' },
                            { icon: 'phone', label: 'Phone', href: 'tel:+97695945838' },
                        ].map((s) =>
                            s.href ? (
                                <a
                                    key={s.label}
                                    href={s.href}
                                    target={s.href.startsWith('http') ? '_blank' : undefined}
                                    rel={s.href.startsWith('http') ? 'noreferrer' : undefined}
                                    style={socialBtn}
                                    aria-label={s.label}
                                >
                                    <MatIcon name={s.icon} size={18} color="var(--fg-3)" />
                                </a>
                            ) : (
                                <button key={s.label} type="button" onClick={s.onClick} style={socialBtn} aria-label={s.label}>
                                    <MatIcon name={s.icon} size={18} color="var(--fg-3)" />
                                </button>
                            )
                        )}
                    </div>
                </div>
                {cols.map((c) => (
                    <div key={c.h}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 14, letterSpacing: '0.02em' }}>{c.h}</div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {c.items.map((item) => (
                                <li key={item.label}>
                                    <button
                                        type="button"
                                        onClick={item.onClick ? item.onClick : () => item.path && navigate(item.path)}
                                        style={footerLinkBtn}
                                        onMouseEnter={(e) => (e.currentTarget.style.color = '#0f766e')}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-4)')}
                                    >
                                        {item.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div style={{ maxWidth: contentWidth, margin: '0 auto', padding: '0 32px 32px' }}>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, fontSize: 11, color: 'var(--fg-5)', lineHeight: 1.8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 16 }}>
                        <div>
                            <div style={{ fontWeight: 700, color: 'var(--fg-3)', marginBottom: 6 }}>[モンゴル本社]</div>
                            <div>商号: Mongolia Milky Way (SUUN ZAM) | 代表者: Davaasuren Bilguun</div>
                            <div>事業者登録番号: 9011640064 | 観光事業登録番号: 6124313</div>
                            <div>電話: +976 9594 5838 | Tel: +976-8010-7766</div>
                            <div>所在地: ウランバートル バヤンズルフ区 13棟 DACOセンター 3階 306</div>
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, color: 'var(--fg-3)', marginBottom: 6 }}>[韓国代理店]</div>
                            <div>商号: Hello Bolor | 代表者: Davaasuren Bolor</div>
                            <div>事業者登録番号: 730-54-00614 | 通信販売業番号: 第2022-ソウル中浪-1776号</div>
                            <div>メール: bolor1@hanmail.net</div>
                            <div>お問い合わせ: 公式LINE またはチャットでお問い合わせください。</div>
                        </div>
                    </div>
                    <div
                        style={{
                            borderTop: '1px solid var(--border)',
                            paddingTop: 16,
                            display: 'flex',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div>© 2026 Mongolia Milky Way. All rights reserved.</div>
                        <div style={{ display: 'flex', gap: 18 }}>
                            <button type="button" onClick={() => navigate('/about')} style={legalLinkBtn}>
                                会社案内
                            </button>
                            <button type="button" onClick={() => navigate('/terms-of-service')} style={legalLinkBtn}>
                                利用規約
                            </button>
                            <button type="button" onClick={() => navigate('/privacy-policy')} style={legalLinkBtn}>
                                個人情報処理方針
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

const socialBtn = {
    width: 38,
    height: 38,
    borderRadius: 999,
    border: '1px solid var(--border)',
    background: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    padding: 0,
} as const;

const footerLinkBtn = {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: 13,
    color: 'var(--fg-4)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'color 150ms',
} as const;

const legalLinkBtn = {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: 11,
    color: 'var(--fg-5)',
    cursor: 'pointer',
    fontFamily: 'inherit',
} as const;
