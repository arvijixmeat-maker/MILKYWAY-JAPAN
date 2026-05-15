import { useState } from 'react';
import type { TourProduct, TourPricingOption } from '../../types/product';
import { MatIcon } from '../desktop-primitives/MatIcon';
import {
    SummaryRow,
    fmtMD,
    formatPrice,
    isUsableImageUrl,
    FALLBACK_HERO_GRADIENT,
} from './primitives';

interface BookingSummaryProps {
    product: TourProduct;
    selectedStartDate: Date | null;
    endDate: Date | null;
    nights: number;
    days: number;
    people: number;
    baseOption: TourPricingOption | null;
    total: number;
    deposit: number;
    local: number;
    /** Selected accommodation option (already resolved by parent). */
    accommodationLabel?: string;
    accommodationSub?: string;
    /** Selected vehicle option (already resolved). */
    vehicleLabel?: string;
    vehicleSub?: string;
    /** CTA */
    ctaLabel: string;
    ctaIcon?: string;
    onCta: () => void;
    canProceed: boolean;
    canProceedHint?: string | null;
}

/**
 * Right sticky summary card. Used on step 0 + step 1.
 * Picks up the same admin-managed product image as the rest of the site
 * (gradient fallback when admin hasn't uploaded anything yet).
 */
export function BookingSummary({
    product,
    selectedStartDate,
    endDate,
    nights,
    days,
    people,
    baseOption,
    total,
    deposit,
    local,
    accommodationLabel,
    accommodationSub,
    vehicleLabel,
    vehicleSub,
    ctaLabel,
    ctaIcon,
    onCta,
    canProceed,
    canProceedHint,
}: BookingSummaryProps) {
    const hero = product.mainImages?.[0];
    const [heroBroken, setHeroBroken] = useState(false);
    const showHeroImg = !heroBroken && isUsableImageUrl(hero);
    const cleanTitle = product.name.replace(/^\[[^\]]+\]\s*/, '');
    const perPax = baseOption?.pricePerPerson ?? product.price ?? 0;

    return (
        <aside style={{ position: 'sticky', top: 200 }}>
            <div
                style={{
                    background: '#fff',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    boxShadow: '0 12px 32px -8px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                }}
            >
                {/* Hero photo — actual <img> so onError lets us swap to the
                    brand-color gradient when admin's URL is broken or missing. */}
                <div
                    style={{
                        aspectRatio: '16/9',
                        position: 'relative',
                        background: FALLBACK_HERO_GRADIENT,
                        overflow: 'hidden',
                    }}
                >
                    {showHeroImg && (
                        <img
                            src={hero!}
                            alt={cleanTitle}
                            loading="lazy"
                            decoding="async"
                            onError={() => setHeroBroken(true)}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                            }}
                        />
                    )}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background:
                                'linear-gradient(to top, rgba(0,0,0,0.65), transparent 60%)',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 14,
                            left: 16,
                            right: 16,
                            color: '#fff',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                opacity: 0.85,
                                marginBottom: 4,
                                letterSpacing: '0.04em',
                                fontWeight: 600,
                            }}
                        >
                            {product.category}｜{product.duration}
                        </div>
                        <div
                            style={{
                                fontSize: 15,
                                fontWeight: 700,
                                lineHeight: 1.35,
                                letterSpacing: '-0.01em',
                            }}
                        >
                            {cleanTitle}
                        </div>
                    </div>
                </div>

                {/* Selection summary */}
                <div style={{ padding: '20px 22px 0' }}>
                    <SummaryRow
                        icon="calendar_month"
                        k="旅行期間"
                        v={
                            selectedStartDate && endDate
                                ? `${fmtMD(selectedStartDate)} 〜 ${fmtMD(endDate)}`
                                : '未選択'
                        }
                        sub={`${nights}泊${days}日`}
                    />
                    <SummaryRow
                        icon="group"
                        k="人数"
                        v={`${people} 名`}
                        sub={`お1人様 ¥${formatPrice(perPax)}`}
                    />
                    {accommodationLabel && (
                        <SummaryRow
                            icon="bed"
                            k="宿泊"
                            v={accommodationLabel}
                            sub={accommodationSub}
                        />
                    )}
                    <SummaryRow
                        icon="directions_car"
                        k="車両"
                        v={vehicleLabel ?? '基本車両 (自動手配)'}
                        sub={vehicleSub ?? '追加料金なし'}
                        last
                    />
                </div>

                {/* Pricing breakdown */}
                <div
                    style={{
                        padding: '12px 22px 0',
                        marginTop: 4,
                        borderTop: '1px dashed var(--border-subtle)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '10px 0',
                            fontSize: 13,
                            color: 'var(--fg-4)',
                        }}
                    >
                        <span>お一人様 × {people} 名</span>
                        <span>¥{formatPrice(perPax * people)}</span>
                    </div>
                </div>

                {/* Realtime total */}
                <div
                    style={{
                        margin: '8px 18px 0',
                        padding: '16px 18px',
                        background: 'var(--bg-muted)',
                        borderRadius: 14,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--fg-5)', fontWeight: 600 }}>
                                リアルタイム予想合計
                            </div>
                            <div
                                style={{
                                    fontSize: 26,
                                    fontWeight: 700,
                                    color: 'var(--fg-1)',
                                    letterSpacing: '-0.02em',
                                    marginTop: 2,
                                }}
                            >
                                ¥{formatPrice(total)}
                            </div>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 999,
                                    background: '#fff',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <MatIcon name="person" size={18} color="var(--fg-3)" />
                            </div>
                            {people > 1 && (
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 999,
                                        background: 'var(--primary-soft, rgba(15,118,110,0.18))',
                                        color: 'var(--primary-dark, #115e59)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        marginLeft: -8,
                                        border: '2px solid #fff',
                                    }}
                                >
                                    +{people - 1}
                                </div>
                            )}
                        </div>
                    </div>
                    <div
                        style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTop: '1px dashed var(--border)',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 8,
                            fontSize: 12,
                        }}
                    >
                        <div>
                            <div style={{ color: 'var(--fg-5)' }}>予約金</div>
                            <div
                                style={{
                                    fontWeight: 700,
                                    color: '#0f766e',
                                    marginTop: 2,
                                }}
                            >
                                ¥{formatPrice(deposit)}
                            </div>
                        </div>
                        <div>
                            <div style={{ color: 'var(--fg-5)' }}>現地支払い</div>
                            <div style={{ fontWeight: 700, color: 'var(--fg-2)', marginTop: 2 }}>
                                ¥{formatPrice(local)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div style={{ padding: '16px 18px 18px' }}>
                    <button
                        type="button"
                        onClick={onCta}
                        disabled={!canProceed}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: canProceed ? '#0f766e' : 'var(--fg-6)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 12,
                            fontSize: 15,
                            fontWeight: 700,
                            cursor: canProceed ? 'pointer' : 'not-allowed',
                            fontFamily: 'inherit',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow: canProceed
                                ? '0 8px 20px -6px rgba(15,118,110,0.5)'
                                : 'none',
                            transition: 'all 150ms',
                        }}
                    >
                        {ctaLabel}{' '}
                        <MatIcon name={ctaIcon ?? 'arrow_forward'} size={18} color="#fff" />
                    </button>
                    {canProceedHint && (
                        <div
                            style={{
                                marginTop: 10,
                                fontSize: 11,
                                color: '#dc2626',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                            }}
                        >
                            <MatIcon name="info" size={14} color="#dc2626" />
                            {canProceedHint}
                        </div>
                    )}
                    <div
                        style={{
                            marginTop: 12,
                            padding: '10px 12px',
                            background: 'var(--primary-tint, rgba(15,118,110,0.08))',
                            borderRadius: 10,
                            fontSize: 11,
                            color: 'var(--primary-dark, #115e59)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            lineHeight: 1.5,
                        }}
                    >
                        <MatIcon
                            name="verified"
                            size={14}
                            filled
                            color="var(--primary-dark, #115e59)"
                        />
                        <span>
                            <strong>無料キャンセル</strong> — 出発30日前まで全額返金
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
