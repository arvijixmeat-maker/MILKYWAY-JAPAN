import { useState, type CSSProperties, type ReactNode } from 'react';
import { DEPOSIT_POLICY } from '../../constants/company';
import type { TourPricingOption } from '../../types/product';
import { MW, MW_FONT_EN, isUsableImage, yen } from '../desktop-primitives/mwTokens';
import { D } from '../mobile/mobileTheme';
import { Ico } from '../mobile/mobileUi';
import { BookCard, LineLink } from './BookingCard';
import {
    BK_CANCEL_NOTES, BK_D, BK_DARK_GRADIENT, BK_ERR_BG, BK_HAIR, BK_PAY_NOTES, BK_SOFT,
    bareName, durationLabel, periodLong,
    type BookingProduct, type CustomerInfo, type FieldError, type PriceBreakdown,
} from './bookingShared';

/** STEP 2 cards (Claude Design: "Booking Tour Info / Person / Amount / Pay Method / Cancel"). */

/** Red banner for errors that do not belong to one field (login, missing data, failed request). */
export function BookingErrorAlert({ error }: { error: FieldError }) {
    return (
        <div role="alert" data-payment-field={error.field} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderRadius: 18, background: BK_ERR_BG, color: MW.redDeep, fontSize: 14, fontWeight: 700, lineHeight: 1.6 }}>
            <Ico d={BK_D.warn} size={18} width={2} color={MW.redDeep} style={{ flexShrink: 0 }} />
            {error.msg}
        </div>
    );
}

function Thumb({ src, size }: { src?: string; size: number }) {
    const [broken, setBroken] = useState(false);
    return (
        <span style={{ position: 'relative', width: size, height: size, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: MW.line }}>
            {!broken && isUsableImage(src) && (
                <img src={src} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
        </span>
    );
}

function InfoTile({ icon, k, v, sub }: { icon: string; k: string; v: string; sub?: string }) {
    return (
        <div style={{ display: 'flex', gap: 14, padding: 18, borderRadius: 18, background: BK_SOFT, minWidth: 0 }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ico d={icon} size={20} color={MW.mintDeep} />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: MW.mute2 }}>{k}</span>
                <span style={{ fontSize: 15, fontWeight: 900, lineHeight: 1.5 }}>{v}</span>
                {sub && <span style={{ fontSize: 11, color: MW.mute2 }}>{sub}</span>}
            </span>
        </div>
    );
}

export function BookingTourInfoCard({
    pc, product, start, end, nights, days, totalPeople, baseOption,
}: {
    pc: boolean;
    product: BookingProduct;
    start: Date | null;
    end: Date | null;
    nights: number;
    days: number;
    totalPeople: number;
    baseOption: TourPricingOption | null;
}) {
    const title = bareName(product.name);
    const dated = !!start && !!end;
    // Quote bookings have no calendar dates; they show the quote's own duration text instead.
    const period = start && end ? periodLong(start, end) : product.duration || '';
    const lengthLabel = durationLabel(nights, days, dated ? product.duration : undefined);
    const unitSub = baseOption ? `お1人様 ${yen(baseOption.pricePerPerson)}` : '';
    const tagLine = [product.category, durationLabel(nights, days, product.duration)].filter(Boolean).join('｜');

    if (pc) {
        return (
            <BookCard pc eyebrow="TOUR INFO" title="選択した旅行情報">
                <span style={{ fontSize: 17, fontWeight: 900, lineHeight: 1.5, marginTop: -6 }}>{title}</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 10 }}>
                    {period && <InfoTile icon={D.calendar} k="旅行期間" v={period} sub={lengthLabel || undefined} />}
                    <InfoTile icon={D.people} k="予約人数" v={`計 ${totalPeople} 名`} sub={unitSub || undefined} />
                </div>
            </BookCard>
        );
    }

    return (
        <BookCard pc={false} eyebrow="TOUR INFO" title="選択した旅行情報" gap={14}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, borderRadius: 16, background: BK_SOFT, minWidth: 0 }}>
                <Thumb src={product.mainImages?.[0]} size={56} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    {tagLine && <span style={{ fontSize: 11, fontWeight: 700, color: MW.mintDeep }}>{tagLine}</span>}
                    <span style={{ fontSize: 15, fontWeight: 900, lineHeight: 1.4 }}>{title}</span>
                </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {period && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '10px 2px', borderBottom: `1px solid ${BK_HAIR}` }}>
                        <span style={{ fontSize: 12, color: MW.mute, flexShrink: 0 }}>旅行期間</span>
                        <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'right', lineHeight: 1.5 }}>{period}</span>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 2px' }}>
                    <span style={{ fontSize: 12, color: MW.mute, flexShrink: 0 }}>予約人数</span>
                    <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'right' }}>
                        計 {totalPeople} 名
                        {unitSub && <span style={{ fontWeight: 400, color: MW.mute2 }}>（{unitSub}）</span>}
                    </span>
                </div>
            </div>
        </BookCard>
    );
}

const fieldLabel: CSSProperties = { fontSize: 12, fontWeight: 700, color: MW.mute };

function FieldWrap({ name, label, required, error, note, children }: { name: string; label: string; required?: boolean; error?: string; note?: string; children: ReactNode }) {
    return (
        <label data-payment-field={name} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <span style={fieldLabel}>
                {label} {required && <span style={{ color: MW.red }}>*</span>}
            </span>
            {children}
            {error && <span role="alert" style={{ fontSize: 12, fontWeight: 700, color: MW.redDeep }}>{error}</span>}
            {note && <span style={{ fontSize: 11, color: MW.mute2 }}>{note}</span>}
        </label>
    );
}

export function BookingPersonCard({
    pc, customerInfo, setCustomerInfo, memo, setMemo, fieldError, onFieldEdit,
}: {
    pc: boolean;
    customerInfo: CustomerInfo;
    setCustomerInfo: (info: CustomerInfo) => void;
    memo: string;
    setMemo: (s: string) => void;
    fieldError: FieldError | null;
    onFieldEdit: (field: string) => void;
}) {
    const errOf = (field: keyof CustomerInfo) => (fieldError?.field === field ? fieldError.msg : undefined);
    // 16px text on mobile keeps iOS from zooming the page when a field gets focus.
    const input = (field: keyof CustomerInfo): CSSProperties => ({
        boxSizing: 'border-box', width: '100%', height: pc ? 52 : 50, border: `1.5px solid ${errOf(field) ? MW.red : MW.line2}`, borderRadius: 14,
        padding: pc ? '0 16px' : '0 14px', fontFamily: 'inherit', fontSize: pc ? 15 : 16, color: MW.navy, background: '#FFFFFF', outline: 'none', boxShadow: 'none',
    });
    const edit = (field: keyof CustomerInfo, value: string) => {
        setCustomerInfo({ ...customerInfo, [field]: value });
        onFieldEdit(field);
    };

    return (
        <BookCard pc={pc} eyebrow="BOOKING PERSON" title="予約者情報">
            <style>{'.bk-input:focus{border-color:#27AB8F !important}'}</style>
            <div style={pc ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 16 } : { display: 'flex', flexDirection: 'column', gap: 14 }}>
                <FieldWrap name="name" label="お名前" required error={errOf('name')}>
                    <input className="bk-input" type="text" value={customerInfo.name} onChange={(e) => edit('name', e.target.value)} placeholder="山田 花子" autoComplete="name" aria-required aria-invalid={!!errOf('name')} style={input('name')} />
                </FieldWrap>
                <FieldWrap name="phone" label="携帯電話番号" required error={errOf('phone')}>
                    <input className="bk-input" type="tel" value={customerInfo.phone} onChange={(e) => edit('phone', e.target.value)} placeholder="090-0000-0000" autoComplete="tel" aria-required aria-invalid={!!errOf('phone')} style={input('phone')} />
                </FieldWrap>
            </div>
            <FieldWrap name="email" label="メールアドレス" required error={errOf('email')} note="PayPal の請求書がこのメールアドレスに送信されます">
                <input className="bk-input" type="email" value={customerInfo.email} onChange={(e) => edit('email', e.target.value)} placeholder="example@mail.com" autoComplete="email" aria-required aria-invalid={!!errOf('email')} style={input('email')} />
            </FieldWrap>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={fieldLabel}>ご要望・特記事項（任意）</span>
                <textarea
                    className="bk-input"
                    rows={4}
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="食事のアレルギー、希望のオプション等がございましたらご記入ください"
                    style={{ boxSizing: 'border-box', width: '100%', border: `1.5px solid ${MW.line2}`, borderRadius: 14, padding: '14px 16px', fontFamily: 'inherit', fontSize: pc ? 15 : 16, lineHeight: 1.7, color: MW.navy, background: '#FFFFFF', resize: 'vertical', outline: 'none', boxShadow: 'none' }}
                />
            </label>
        </BookCard>
    );
}

export function BookingAmountCard({
    pc, priceBreakdown, baseOption, totalPeople,
}: { pc: boolean; priceBreakdown: PriceBreakdown; baseOption: TourPricingOption | null; totalPeople: number }) {
    const depositUnit = baseOption?.depositPerPerson ?? 0;
    return (
        <BookCard pc={pc} eyebrow="PAYMENT" title="決済金額">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '4px 0 16px', borderBottom: `1px solid ${BK_HAIR}` }}>
                    <span style={{ fontSize: 14, color: MW.ink3 }}>総旅行費用</span>
                    <span style={{ fontFamily: MW_FONT_EN, fontSize: 18, fontWeight: 600 }}>{yen(priceBreakdown.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, margin: priceBreakdown.local > 0 ? '16px 0' : '16px 0 0', padding: pc ? '20px 22px' : '18px', borderRadius: 18, background: BK_DARK_GRADIENT, color: '#FFFFFF' }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 900 }}>今すぐ決済する予約金</span>
                        {depositUnit > 0 && <span style={{ fontSize: 11, color: MW.mintTint }}>お1人様 {yen(depositUnit)} × {totalPeople}名</span>}
                    </span>
                    <span style={{ fontFamily: MW_FONT_EN, fontSize: pc ? 26 : 22, fontWeight: 600, color: MW.mintLight, whiteSpace: 'nowrap' }}>{yen(priceBreakdown.deposit)}</span>
                </div>
                {priceBreakdown.local > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 14, color: MW.ink3 }}>現地支払い残金</span>
                            <span style={{ fontSize: 11, color: MW.mute2 }}>旅行当日にガイドへ直接お支払い</span>
                        </span>
                        <span style={{ fontFamily: MW_FONT_EN, fontSize: 15, fontWeight: 600 }}>{yen(priceBreakdown.local)}</span>
                    </div>
                )}
            </div>
        </BookCard>
    );
}

const PAY_CHIPS: { d: string; label: string }[] = [
    { d: BK_D.credit, label: 'クレジットカード' },
    { d: BK_D.debit, label: 'デビットカード' },
    { d: BK_D.bank, label: 'PayPal 残高' },
];

export function BookingPayMethodCard({ pc }: { pc: boolean }) {
    return (
        <BookCard pc={pc} eyebrow="PAYMENT METHOD" title="予約金のお支払いについて">
            <div style={{ display: 'flex', gap: pc ? 16 : 12, padding: pc ? 20 : 16, borderRadius: 20, background: MW.mintBg }}>
                <span style={{ width: 48, height: 48, borderRadius: 14, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Ico d={D.mail} size={22} color={MW.mintDeep} />
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 900 }}>PayPal 請求書（Eメール）</span>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, color: MW.ink3 }}>
                        予約申し込み完了後、ご入力いただいたメールアドレス宛に PayPal の請求書をお送りいたします。メール内のリンクから、クレジットカード等で安全にお支払いいただけます。
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {PAY_CHIPS.map((c) => (
                            <span key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 999, background: '#FFFFFF', fontSize: 12, fontWeight: 700, color: MW.ink3 }}>
                                <Ico d={c.d} size={14} color={MW.mintDeep} />
                                {c.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: pc ? '18px 20px' : 16, borderRadius: 18, background: BK_SOFT }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 900 }}>
                    <Ico d={BK_D.note} size={16} width={2} />
                    入金時の注意事項
                </span>
                {BK_PAY_NOTES.map((t) => (
                    <span key={t} style={{ display: 'flex', gap: 8, paddingLeft: pc ? 24 : 4, fontSize: 13, lineHeight: 1.7, color: MW.mute }}>
                        <span style={{ width: 4, height: 4, marginTop: 10, borderRadius: '50%', background: MW.mute2, flexShrink: 0 }} />
                        {t}
                    </span>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 4, padding: pc ? '12px 12px 12px 24px' : 12, borderRadius: 14, background: '#FFFFFF' }}>
                    <span style={{ flex: '1 1 200px', fontSize: 13, lineHeight: 1.7, color: MW.ink3 }}>お支払いに関するご質問は、LINEでお気軽にお問い合わせください。</span>
                    <LineLink label="LINEで問い合わせ" />
                </div>
            </div>
        </BookCard>
    );
}

export function BookingCancelCard({ pc }: { pc: boolean }) {
    return (
        <BookCard pc={pc} eyebrow="CANCELLATION POLICY" title="キャンセル規定">
            {/* The deposit pays the hotels and camps in advance, so it is never refunded (owner policy). */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: pc ? 20 : 16, borderRadius: 18, background: '#FFF8EB' }}>
                <span style={{ fontSize: pc ? 18 : 16, fontWeight: 900, color: '#9A5B00' }}>予約金は返金不可</span>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, color: MW.ink3 }}>{DEPOSIT_POLICY}</p>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {BK_CANCEL_NOTES.map((note) => (
                    <li key={note} style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.7, color: MW.mute }}>
                        <span aria-hidden="true" style={{ color: MW.mint }}>・</span>
                        {note}
                    </li>
                ))}
            </ul>
        </BookCard>
    );
}

/** Consent row. A real checkbox sits under the drawn box so it stays keyboard-operable. */
export function BookingAgreeCard({
    pc, checked, onToggle, error,
}: { pc: boolean; checked: boolean; onToggle: () => void; error?: string }) {
    const link: CSSProperties = { color: MW.ink3, textDecoration: 'underline' };
    return (
        <div data-payment-field="terms" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <style>{'.bk-agree:focus-within{outline:2px solid #27AB8F;outline-offset:2px}'}</style>
            <label className="bk-agree" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, padding: pc ? '22px 28px' : '16px 18px', border: `1.5px solid ${error ? MW.red : '#FFFFFF'}`, borderRadius: pc ? 24 : 20, background: '#FFFFFF', cursor: 'pointer', color: MW.ink3, userSelect: 'none' }}>
                <input type="checkbox" checked={checked} onChange={onToggle} style={{ position: 'absolute', width: 1, height: 1, margin: 0, opacity: 0, pointerEvents: 'none' }} />
                <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: 8, boxSizing: 'border-box', border: `2px solid ${checked ? MW.mint : '#B8C4C1'}`, background: checked ? MW.mint : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {checked && <Ico d={BK_D.tick} size={14} width={3} />}
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.7 }}>
                    <strong style={{ color: MW.navy }}>注文内容を確認し、決済に同意します。</strong>{' '}
                    <a href="/terms-of-service" target="_blank" rel="noreferrer" style={link}>利用規約</a>
                    ・
                    <a href="/privacy-policy" target="_blank" rel="noreferrer" style={link}>個人情報処理方針</a>
                    に同意します。
                </span>
            </label>
            {error && <span role="alert" style={{ padding: '0 6px', fontSize: 12, fontWeight: 700, color: MW.redDeep }}>{error}</span>}
        </div>
    );
}
