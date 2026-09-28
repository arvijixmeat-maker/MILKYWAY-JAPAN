import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MW, MW_FONT, MW_FONT_EN } from '../desktop-primitives/mwTokens';

const GROUPS: { title: string; links: [string, string][] }[] = [
    {
        title: 'サービス',
        links: [
            ['モンゴル旅行ガイド', '/travel-guide'],
            ['モンゴルツアー商品一覧', '/products'],
            ['モンゴル乗馬旅行', '/category/horse-riding-tour'],
            ['ゴビ砂漠ツアー', '/category/gobi-desert'],
            ['同行者を探す', '/travel-mates'],
            ['お見積もりリクエスト', '/custom-estimate'],
        ],
    },
    {
        title: 'ご利用案内',
        links: [
            ['ご予約の流れ', '/about'],
            ['よくある質問 (FAQ)', '/faq'],
            ['利用規約', '/terms-of-service'],
            ['プライバシーポリシー', '/privacy-policy'],
            ['ご予約状況の確認', '/reservation-status'],
        ],
    },
    {
        title: '会社情報',
        links: [
            ['会社案内', '/about'],
            ['ガイド募集', '/guide-apply'],
            ['お客様のレビュー', '/reviews'],
            ['マイページ', '/mypage'],
        ],
    },
];

/** Mobile footer. Collapsed groups keep their links in the DOM (crawlable), only hidden. */
export function MobileFooter() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [open, setOpen] = useState<number | null>(null);

    return (
        // Bottom padding clears the fixed tab bar.
        <footer style={{ marginTop: 48, borderTop: `1px solid ${MW.line}`, padding: '28px 16px 116px', display: 'flex', flexDirection: 'column', gap: 20, fontFamily: MW_FONT, color: MW.navy }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontFamily: MW_FONT_EN, fontWeight: 700, fontSize: 18 }}>
                    Milkyway<span style={{ color: MW.mint }}> Japan</span>
                </span>
                <span style={{ fontSize: 11, color: MW.mute }}>Mongolia Milky Way (SUUN ZAM)</span>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.8, color: MW.mute }}>
                    モンゴル旅行・モンゴルツアー専門の現地旅行社です。日本語堪能な専門ガイドが同行し、安心・安全なご旅行をご提案します。
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #EEF1EF' }}>
                {GROUPS.map((g, i) => {
                    const on = open === i;
                    return (
                        <div key={g.title} style={{ borderBottom: '1px solid #EEF1EF' }}>
                            <button
                                type="button"
                                onClick={() => setOpen(on ? null : i)}
                                aria-expanded={on}
                                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 52, padding: 0, border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: MW.navy, cursor: 'pointer' }}
                            >
                                {g.title}
                                <span aria-hidden="true" style={{ fontSize: 14, color: MW.mute, transform: `rotate(${on ? 180 : 0}deg)`, transition: 'transform .2s' }}>⌄</span>
                            </button>
                            <div style={{ display: on ? 'grid' : 'none', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '12px 16px', padding: '0 0 18px' }}>
                                {g.links.map(([label, path]) => (
                                    <a key={label} href={path} onClick={(e) => { e.preventDefault(); navigate(path); }} style={{ fontSize: 13, color: MW.mute, textDecoration: 'none' }}>
                                        {label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 11, lineHeight: 1.8, color: MW.mute }}>
                <div>
                    <strong style={{ color: MW.navy }}>[モンゴル本社]</strong>
                    <br />商号: Mongolia Milky Way (SUUN ZAM) | 代表者: Davaasuren Bilguun
                    <br />事業者登録番号: 9011640064 | 観光事業登録番号: 6124313
                    <br />電話: <a href="tel:+97695945838" style={{ color: MW.mute }}>+976 9594 5838</a> | Tel: +976-8010-7766
                    <br />所在地: ウランバートル バヤンズルフ区 13棟 DACOセンター 3階 306
                </div>
                <div>
                    <strong style={{ color: MW.navy }}>[韓国代理店]</strong>
                    <br />商号: Hello Bolor | 代表者: Davaasuren Bolor
                    <br />事業者登録番号: 730-54-00614 | 通信販売業番号: 第2022-ソウル中浪-1776号
                    <br />メール: bolor1@hanmail.net
                    <br />お問い合わせ: 公式LINE またはチャットでお問い合わせください。
                </div>
                {/* Seller / intermediary notices required for online sales — keep even though the design omits them. */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: MW.mute2 }}>
                    <span>{t('footer.disclaimer_1')}</span>
                    <span>{t('footer.disclaimer_2')}</span>
                    <span>{t('footer.disclaimer_3')}</span>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16, borderTop: '1px solid #EEF1EF', fontSize: 11, color: MW.mute }}>
                <div style={{ display: 'flex', gap: 16 }}>
                    <a href="/about" style={{ color: MW.mute, textDecoration: 'none' }}>会社案内</a>
                    <a href="/terms-of-service" style={{ color: MW.mute, textDecoration: 'none' }}>利用規約</a>
                    <a href="/privacy-policy" style={{ color: MW.mute, textDecoration: 'none' }}>個人情報処理方針</a>
                </div>
                <span>© {new Date().getFullYear()} Mongolia Milky Way. All rights reserved.</span>
            </div>
        </footer>
    );
}
