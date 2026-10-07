import { useEffect, useState } from 'react';
import type { TourPricingOption } from '../../types/product';
import { MW, MW_FONT, MW_FONT_EN, MW_GRADIENT, yen } from '../desktop-primitives/mwTokens';
import { D } from '../mobile/mobileTheme';
import { Ico } from '../mobile/mobileUi';
import { BK_D, BK_HAIR, BK_SOFT } from './bookingShared';

interface PriceTableDialogProps {
    /** Centered modal on PC, bottom sheet on mobile. */
    pc: boolean;
    /** Admin-managed tiers, sorted by head count. */
    options: TourPricingOption[];
    current: number;
    /** Picking a row selects that head count (the caller closes the dialog). */
    onChange: (people: number) => void;
    onClose: () => void;
}

const COLS = '1fr 1.3fr 1.1fr';
const WHY_ITEMS = ['専用ガイド (1名 / グループ)', '専用車両 + 運転手', '宿泊コーディネート'];

/** 人数別のお1人様単価: what the admin set per head count, nothing hardcoded. */
export function PriceTableDialog({ pc, options, current, onChange, onClose }: PriceTableDialogProps) {
    const [whyOpen, setWhyOpen] = useState(false);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            document.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    const lowest = options.length ? Math.min(...options.map((o) => o.pricePerPerson)) : 0;
    const highest = options.length ? Math.max(...options.map((o) => o.pricePerPerson)) : 0;
    const currentOpt = options.find((o) => o.people === current);

    return (
        <div role="dialog" aria-modal="true" aria-label="人数別のお1人様単価のご案内" data-mw-overlay="" style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: pc ? 'center' : 'flex-end', padding: pc ? 24 : 0, fontFamily: MW_FONT, color: MW.navy }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(10,31,46,0.45)' }} />
            <div style={{ position: 'relative', width: '100%', maxWidth: pc ? 560 : 480, maxHeight: pc ? '90vh' : '92vh', background: '#FFFFFF', borderRadius: pc ? 28 : '24px 24px 0 0', display: 'flex', flexDirection: 'column', boxShadow: pc ? '0 30px 60px -20px rgba(10,31,46,0.35)' : 'none' }}>
                {!pc && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
                        <span style={{ width: 40, height: 4, borderRadius: 999, background: MW.line2 }} />
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: pc ? '24px 28px 8px' : '8px 16px 8px' }}>
                    <h3 style={{ margin: 0, fontSize: pc ? 19 : 17, fontWeight: 900 }}>人数別のお1人様単価のご案内</h3>
                    <button type="button" onClick={onClose} aria-label="閉じる" style={{ width: 44, height: 44, border: 0, background: 'transparent', fontSize: 22, color: MW.navy, cursor: 'pointer', marginRight: -10, padding: 0, flexShrink: 0 }}>×</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: pc ? '8px 28px 0' : '4px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {currentOpt && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, border: `1.5px solid ${MW.mint}`, background: MW.mintBg }}>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: MW.mintDeep }}>現在のご選択</span>
                                <span style={{ fontSize: 16, fontWeight: 900 }}>
                                    {currentOpt.people}名 ・ {yen(currentOpt.pricePerPerson)}
                                    <span style={{ marginLeft: 4, fontSize: 12, fontWeight: 500, color: MW.mute2 }}>/ 名</span>
                                </span>
                            </span>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: MW.mute2 }}>合計</span>
                                <span style={{ fontFamily: MW_FONT_EN, fontSize: pc ? 18 : 16, fontWeight: 600, color: MW.mintDeep }}>{yen(currentOpt.pricePerPerson * currentOpt.people)}</span>
                            </span>
                        </div>
                    )}

                    <div style={{ border: `1px solid ${MW.line}`, borderRadius: 16, overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '10px 14px', background: BK_SOFT, fontSize: 11, fontWeight: 700, color: MW.mute2 }}>
                            <span>人数</span>
                            <span style={{ textAlign: 'right' }}>お1人様単価</span>
                            <span style={{ textAlign: 'right' }}>合計</span>
                        </div>
                        {options.length === 0 && <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: MW.mute }}>価格情報がありません。</div>}
                        {options.map((o) => {
                            const on = o.people === current;
                            const best = o.pricePerPerson === lowest && lowest < highest;
                            const savings = highest - o.pricePerPerson;
                            return (
                                <button
                                    key={o.people}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => onChange(o.people)}
                                    style={{ width: '100%', display: 'grid', gridTemplateColumns: COLS, alignItems: 'center', padding: '14px', border: 0, borderTop: `1px solid ${BK_HAIR}`, background: on ? MW.mintBg : '#FFFFFF', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', color: MW.navy }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 15, fontWeight: 900, color: on ? MW.mintDeep : MW.navy }}>{o.people}名</span>
                                        {on && <span style={{ height: 18, padding: '0 6px', borderRadius: 999, background: MW.navy, display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 700, color: '#FFFFFF' }}>現在</span>}
                                        {best && <span style={{ height: 18, padding: '0 6px', borderRadius: 999, background: MW.red, display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 700, color: '#FFFFFF' }}>最安</span>}
                                    </span>
                                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                                        <span style={{ fontFamily: MW_FONT_EN, fontSize: 13, fontWeight: 600 }}>{yen(o.pricePerPerson)}</span>
                                        {savings > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: MW.mintDeep }}>お1人様 {yen(savings)} OFF</span>}
                                    </span>
                                    <span style={{ textAlign: 'right', fontFamily: MW_FONT_EN, fontSize: 13, fontWeight: 600, color: on ? MW.mintDeep : MW.navy }}>{yen(o.pricePerPerson * o.people)}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ borderRadius: 16, background: BK_SOFT, flexShrink: 0 }}>
                        <button type="button" onClick={() => setWhyOpen((v) => !v)} aria-expanded={whyOpen} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: MW.navy, textAlign: 'left', cursor: 'pointer' }}>
                            <Ico d={D.faq} size={16} color={MW.mintDeep} />
                            <span style={{ flex: 1 }}>なぜ人数によって料金が違うの？</span>
                            <Ico d={BK_D.down} size={16} width={2} color={MW.mute} style={{ transform: `rotate(${whyOpen ? 180 : 0}deg)`, transition: 'transform .2s' }} />
                        </button>
                        {whyOpen && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px 16px', fontSize: 13, lineHeight: 1.7, color: MW.mute }}>
                                <span>専用ガイド・運転手・車両費を人数で分担するため、人数が多いほどお1人様あたりの料金がお得になります。</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: MW.navy }}>含まれる固定費用：</span>
                                {WHY_ITEMS.map((t) => (
                                    <span key={t} style={{ display: 'flex', gap: 8 }}>
                                        <span style={{ width: 4, height: 4, marginTop: 9, borderRadius: '50%', background: MW.mint, flexShrink: 0 }} />
                                        {t}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ padding: pc ? '16px 28px 24px' : '12px 16px calc(12px + env(safe-area-inset-bottom))' }}>
                    <button type="button" onClick={onClose} style={{ width: '100%', height: 52, border: 0, borderRadius: 999, background: MW_GRADIENT, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: MW.navy, cursor: 'pointer' }}>この人数で予約する</button>
                </div>
            </div>
        </div>
    );
}
