import type { CSSProperties } from 'react';
import type { TourPricingOption } from '../../types/product';
import { MW, MW_FONT_EN, isUsableImage, yen } from '../desktop-primitives/mwTokens';
import { Ico } from '../mobile/mobileUi';
import { BookCard } from './BookingCard';
import { BookingCalendar } from './BookingCalendar';
import {
    BK_D, BK_PAGE_BG, BK_SOFT, addDays, durationLabel, optionPriceLabel, periodShort, tierPrice,
    type ParsedDuration,
} from './bookingShared';

/** STEP 1 cards (Claude Design: "Booking Date / People / Stay / Car"). */

export function BookingDateCard({
    pc, parsedDuration, value, onChange,
}: { pc: boolean; parsedDuration: ParsedDuration; value: Date | null; onChange: (d: Date) => void }) {
    const nights = Math.max(0, parsedDuration.nights);
    const end = value ? addDays(value, nights) : null;
    return (
        <BookCard
            pc={pc}
            title="旅行開始日を選択"
            sub={nights > 0
                ? `${nights}泊${parsedDuration.days}日の旅行開始日を選択してください。終了日は自動で設定されます。`
                : '旅行開始日を選択してください。'}
        >
            <BookingCalendar pc={pc} value={value} onChange={onChange} nights={nights} />
            {value && end && nights > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '14px 16px', borderRadius: 16, background: MW.mintBg }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: MW.mintDeep }}>選択された旅行期間</span>
                    <span style={{ fontSize: 15, fontWeight: 900 }}>
                        {periodShort(value, end)}
                        <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: MW.mute }}>{durationLabel(nights, parsedDuration.days)}</span>
                    </span>
                </div>
            )}
        </BookCard>
    );
}

const stepBtn: CSSProperties = { width: 40, height: 40, border: 0, borderRadius: '50%', fontFamily: 'inherit', fontSize: 18, color: MW.navy, padding: 0 };

export function BookingPeopleCard({
    pc, tiers, totalPeople, setTotalPeople, baseOption, onShowPrices,
}: {
    pc: boolean;
    /** Admin-managed price tiers, sorted by head count. */
    tiers: TourPricingOption[];
    totalPeople: number;
    setTotalPeople: (n: number) => void;
    baseOption: TourPricingOption | null;
    onShowPrices: () => void;
}) {
    const has = tiers.length > 0;
    const minPeople = has ? tiers[0].people : 1;
    const maxPeople = has ? tiers[tiers.length - 1].people : 1;
    const idx = tiers.findIndex((p) => p.people === totalPeople);
    const atMin = !has || totalPeople <= minPeople;
    const atMax = !has || totalPeople >= maxPeople;
    const lowest = has ? Math.min(...tiers.map((p) => p.pricePerPerson)) : 0;
    const highest = has ? Math.max(...tiers.map((p) => p.pricePerPerson)) : 0;
    const cheaperInGroups = has && tiers[tiers.length - 1].pricePerPerson < tiers[0].pricePerPerson;
    const cols = Math.min(Math.max(tiers.length, 1), pc ? 6 : 5);
    // Narrow chips use "¥105k" only when every tier is a round thousand, so the row stays consistent.
    const compact = !pc && tiers.every((p) => p.pricePerPerson % 1000 === 0);

    // The stepper walks the price tiers, so only head counts that have a price can be picked.
    const dec = () => {
        if (!has) return;
        if (idx > 0) setTotalPeople(tiers[idx - 1].people);
    };
    const inc = () => {
        if (!has) return;
        if (idx < tiers.length - 1) setTotalPeople(tiers[idx + 1].people);
    };

    return (
        <BookCard pc={pc} title="人数の選択">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 900 }}>合計人数</span>
                    <span style={{ fontSize: 12, color: MW.mute }}>
                        {has ? `${minPeople}名〜${maxPeople}名${cheaperInGroups ? '・人数が多いほど1人あたりお得' : ''}` : '人数を選択してください'}
                    </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 5, borderRadius: 999, background: BK_PAGE_BG, flexShrink: 0 }}>
                    <button type="button" onClick={dec} disabled={atMin} aria-label="減らす" style={{ ...stepBtn, background: '#FFFFFF', opacity: atMin ? 0.4 : 1, cursor: atMin ? 'not-allowed' : 'pointer' }}>−</button>
                    <span aria-live="polite" style={{ minWidth: 52, textAlign: 'center', fontSize: 17, fontWeight: 900 }}>{totalPeople} 名</span>
                    <button type="button" onClick={inc} disabled={atMax} aria-label="増やす" style={{ ...stepBtn, background: MW.mint, opacity: atMax ? 0.4 : 1, cursor: atMax ? 'not-allowed' : 'pointer' }}>+</button>
                </span>
            </div>

            {tiers.length > 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, gap: pc ? '14px 8px' : '14px 5px', marginTop: pc ? 0 : 6 }}>
                    {tiers.map((p) => {
                        const on = p.people === totalPeople;
                        return (
                            <button
                                key={p.people}
                                type="button"
                                aria-pressed={on}
                                onClick={() => setTotalPeople(p.people)}
                                style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: pc ? 4 : 3, padding: pc ? '14px 4px' : '12px 2px 10px', borderRadius: pc ? 16 : 14, border: `1.5px solid ${on ? MW.mint : MW.line}`, background: on ? MW.mintBg : '#FFFFFF', fontFamily: 'inherit', cursor: 'pointer', color: MW.navy, minWidth: 0 }}
                            >
                                {p.pricePerPerson === lowest && lowest < highest && (
                                    <span style={{ position: 'absolute', top: -9, height: 18, padding: pc ? '0 8px' : '0 6px', borderRadius: 999, background: MW.red, display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 700, color: '#FFFFFF' }}>お得</span>
                                )}
                                <span style={{ fontSize: pc ? 13 : 12, fontWeight: 900 }}>{p.people}名</span>
                                <span style={{ fontFamily: MW_FONT_EN, fontSize: pc || compact ? 11 : 9, fontWeight: 600, letterSpacing: '-0.02em', color: on ? MW.mintDeep : MW.ink3, whiteSpace: 'nowrap' }}>{tierPrice(p.pricePerPerson, compact)}</span>
                                <span style={{ fontSize: pc ? 10 : 9, color: MW.mute2 }}>/人</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {has && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '12px 14px', borderRadius: 14, background: BK_SOFT }}>
                    <span style={{ fontSize: 13, color: MW.ink3 }}>
                        現在の人数の基準 お1人様 <strong style={{ fontFamily: MW_FONT_EN, fontSize: 13, fontWeight: 600, color: MW.mintDeep }}>{yen(baseOption?.pricePerPerson ?? 0)}</strong>
                    </span>
                    <button type="button" onClick={onShowPrices} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 36, padding: '0 12px 0 14px', border: `1px solid ${MW.line2}`, borderRadius: 999, background: '#FFFFFF', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: MW.navy, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        人数別価格を見る
                        <Ico d={BK_D.down} size={14} width={2} />
                    </button>
                </div>
            )}
        </BookCard>
    );
}

export interface BookingOptionItem {
    id: string;
    name: string;
    description?: string;
    priceModifier: number;
    isDefault?: boolean;
    imageUrl?: string;
}

/** Radio list for the admin-managed accommodation / vehicle options. */
export function BookingOptionCard({
    pc, title, sub, options, selectedId, onSelect,
}: { pc: boolean; title: string; sub?: string; options: BookingOptionItem[]; selectedId: string; onSelect: (id: string) => void }) {
    return (
        <BookCard pc={pc} title={title} sub={sub}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {options.map((o) => {
                    const on = o.id === selectedId;
                    return (
                        <button
                            key={o.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => onSelect(o.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 18, border: `1.5px solid ${on ? MW.mint : MW.line}`, background: on ? MW.mintBg : '#FFFFFF', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', color: MW.navy, minWidth: 0 }}
                        >
                            <span style={{ width: 22, height: 22, borderRadius: '50%', boxSizing: 'border-box', border: `2px solid ${on ? MW.mint : '#B8C4C1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: on ? MW.mint : 'transparent' }} />
                            </span>
                            {isUsableImage(o.imageUrl) && (
                                <img src={o.imageUrl} alt="" loading="lazy" decoding="async" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                            )}
                            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 15, fontWeight: 900 }}>
                                    {o.name}
                                    {o.isDefault && <span style={{ height: 20, padding: '0 8px', borderRadius: 999, background: MW.navy, display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 700, color: '#FFFFFF' }}>基本</span>}
                                </span>
                                {o.description && <span style={{ fontSize: 12, lineHeight: 1.6, color: MW.mute }}>{o.description}</span>}
                            </span>
                            <span style={{ fontFamily: MW_FONT_EN, fontSize: 13, fontWeight: 600, color: on ? MW.mintDeep : MW.mute, whiteSpace: 'nowrap' }}>{optionPriceLabel(o.priceModifier, o.isDefault)}</span>
                        </button>
                    );
                })}
            </div>
        </BookCard>
    );
}
