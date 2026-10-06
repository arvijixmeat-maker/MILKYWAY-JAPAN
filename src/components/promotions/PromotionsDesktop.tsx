import { useNavigate } from 'react-router-dom';
import { MW, MW_FONT_EN } from '../desktop-primitives/mwTokens';
import { PromoCard } from './PromoCard';
import { usePromoFilter, usePromotions } from './promotionsData';

/** PC 旅行企画展 (Claude Design "Milkyway Japan Home" › Promotions). */
export function PromotionsDesktop() {
    const navigate = useNavigate();
    const { items, groups, isLoading } = usePromotions();
    const { tabs, current, setCurrent, list } = usePromoFilter(items, groups);

    return (
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 104px', display: 'flex', flexDirection: 'column', gap: 32 }}>
            <nav aria-label="パンくずリスト" style={{ display: 'flex', gap: 8, fontSize: 13, color: MW.mute }}>
                <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} style={{ color: MW.mute, textDecoration: 'none' }}>ホーム</a>
                <span>›</span>
                <span style={{ color: MW.navy, fontWeight: 700 }}>旅行企画展</span>
            </nav>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: -4 }}>
                <span style={{ fontFamily: MW_FONT_EN, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: MW.mintDeep }}>SPECIAL EXHIBITION</span>
                <h1 style={{ margin: 0, fontSize: 'clamp(32px,4.2vw,48px)', fontWeight: 900, lineHeight: 1.2 }}>旅行企画展</h1>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: MW.mute }}>モンゴル旅行の特集・キャンペーンをまとめてご紹介します。</p>
            </div>

            {isLoading ? (
                <p style={{ margin: 0, padding: '56px 0', textAlign: 'center', fontSize: 14, color: MW.mute }}>読み込み中…</p>
            ) : items.length === 0 ? (
                <div style={{ border: `1px dashed ${MW.line2}`, borderRadius: 16, padding: '56px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 15, color: MW.ink3 }}>現在ご案内中の特集はありません。</p>
                    <a href="/products" onClick={(e) => { e.preventDefault(); navigate('/products'); }} style={{ fontSize: 14, fontWeight: 700, color: MW.mintDeep, textDecoration: 'none' }}>
                        ツアー商品を見る →
                    </a>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: tabs.length > 0 ? 'space-between' : 'flex-end', alignItems: 'flex-end', gap: 16, borderBottom: `1px solid ${MW.line}` }}>
                        {tabs.length > 0 && (
                            <div role="tablist" style={{ display: 'flex', gap: 28, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: -1 }}>
                                {tabs.map((c) => {
                                    const on = c === current;
                                    return (
                                        <button
                                            key={c}
                                            type="button"
                                            role="tab"
                                            aria-selected={on}
                                            onClick={() => setCurrent(c)}
                                            style={{ flexShrink: 0, height: 52, padding: '0 2px', border: 0, borderBottom: `3px solid ${on ? MW.mint : 'transparent'}`, background: 'transparent', fontFamily: 'inherit', fontSize: 15, fontWeight: on ? 700 : 500, color: on ? MW.navy : MW.mute, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                            onMouseEnter={(e) => (e.currentTarget.style.color = MW.navy)}
                                            onMouseLeave={(e) => (e.currentTarget.style.color = on ? MW.navy : MW.mute)}
                                        >
                                            {c}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        <span style={{ flexShrink: 0, fontSize: 14, color: MW.mute, paddingBottom: 16 }}>
                            全 <strong style={{ color: MW.navy, fontWeight: 900 }}>{list.length}</strong>件
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,300px),1fr))', gap: 20 }}>
                        {list.map((item) => (
                            <PromoCard key={item.key} item={item} variant="desktop" />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
