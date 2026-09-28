import { useNavigate } from 'react-router-dom';
import { MW, MW_FONT_EN, MW_GRADIENT } from '../desktop-primitives/mwTokens';

interface FooterLink {
    label: string;
    path?: string;
    onClick?: () => void;
}

export function DesktopFooter() {
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
        <>
            {/* Custom tour CTA */}
            <section
                style={{
                    background:
                        'radial-gradient(600px 320px at 88% 0%,rgba(39,171,143,0.14),rgba(39,171,143,0) 70%),radial-gradient(420px 260px at 0% 100%,rgba(109,219,190,0.10),rgba(109,219,190,0) 70%),#FFFFFF',
                    color: MW.navy,
                    borderTop: `1px solid ${MW.line}`,
                }}
            >
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <span style={{ fontFamily: MW_FONT_EN, fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', color: MW.mintDeep }}>CUSTOM TOUR</span>
                        <h2 style={{ margin: 0, fontSize: 30, fontWeight: 900, lineHeight: 1.35 }}>あなただけの特別なプランを、1分でリクエスト</h2>
                        <p style={{ margin: 0, fontSize: 14, color: MW.mute }}>日本語スタッフが24時間以内にご返信。お見積もりは無料です。</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/custom-estimate')}
                            style={{ background: MW_GRADIENT, color: MW.navy, fontWeight: 700, fontSize: 15, padding: '15px 30px', borderRadius: 999, border: 0, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 20px rgba(39,171,143,0.3)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg,#1C8571 0%,#3FC2A4 100%)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = MW_GRADIENT)}
                        >
                            お見積もり
                        </button>
                        <button
                            type="button"
                            onClick={onConsult}
                            style={{ border: `1.5px solid ${MW.navy}`, background: 'transparent', color: MW.navy, fontWeight: 700, fontSize: 15, padding: '14px 30px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(10,31,46,0.08)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            相談
                        </button>
                    </div>
                </div>
            </section>

            <footer style={{ background: '#FFFFFF', color: MW.ink3, borderTop: `1px solid ${MW.line}` }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px 32px', display: 'flex', flexDirection: 'column', gap: 40 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 40 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <span style={{ fontFamily: MW_FONT_EN, fontWeight: 700, fontSize: 19, color: MW.navy }}>
                                Milkyway<span style={{ color: MW.mint }}> Japan</span>
                            </span>
                            <span style={{ fontSize: 12, color: MW.mute }}>Mongolia Milky Way (SUUN ZAM)</span>
                            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8 }}>
                                モンゴル旅行・モンゴルツアー専門の現地旅行社です。日本語堪能な専門ガイドが同行し、安心・安全なご旅行をご提案します。
                            </p>
                        </div>
                        {cols.map((c) => (
                            <div key={c.h} style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: MW.navy, marginBottom: 4 }}>{c.h}</span>
                                {c.items.map((item) => (
                                    <button
                                        key={item.label}
                                        type="button"
                                        onClick={item.onClick ? item.onClick : () => item.path && navigate(item.path)}
                                        style={linkBtn}
                                        onMouseEnter={(e) => (e.currentTarget.style.color = MW.mintDeep)}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = MW.ink3)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
                            gap: 32,
                            paddingTop: 32,
                            borderTop: `1px solid ${MW.line}`,
                            fontSize: 12,
                            lineHeight: 1.9,
                            color: MW.mute,
                        }}
                    >
                        <div>
                            <strong style={{ color: MW.navy }}>[モンゴル本社]</strong>
                            <br />商号: Mongolia Milky Way (SUUN ZAM) | 代表者: Davaasuren Bilguun
                            <br />事業者登録番号: 9011640064 | 観光事業登録番号: 6124313
                            <br />電話: +976 9594 5838 | Tel: +976-8010-7766
                            <br />所在地: ウランバートル バヤンズルフ区 13棟 DACOセンター 3階 306
                        </div>
                        <div>
                            <strong style={{ color: MW.navy }}>[韓国代理店]</strong>
                            <br />商号: Hello Bolor | 代表者: Davaasuren Bolor
                            <br />事業者登録番号: 730-54-00614 | 通信販売業番号: 第2022-ソウル中浪-1776号
                            <br />メール: bolor1@hanmail.net
                            <br />お問い合わせ: 公式LINE またはチャットでお問い合わせください。
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 16,
                            flexWrap: 'wrap',
                            paddingTop: 24,
                            borderTop: `1px solid ${MW.line}`,
                            fontSize: 12,
                            color: MW.mute,
                        }}
                    >
                        <span>© 2026 Mongolia Milky Way. All rights reserved.</span>
                        <div style={{ display: 'flex', gap: 20 }}>
                            <button type="button" onClick={() => navigate('/about')} style={legalBtn}>会社案内</button>
                            <button type="button" onClick={() => navigate('/terms-of-service')} style={legalBtn}>利用規約</button>
                            <button type="button" onClick={() => navigate('/privacy-policy')} style={legalBtn}>個人情報処理方針</button>
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
}

const linkBtn = {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: 13,
    color: MW.ink3,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'color 150ms',
} as const;

const legalBtn = {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: 12,
    color: MW.mute,
    cursor: 'pointer',
    fontFamily: 'inherit',
} as const;
