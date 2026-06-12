import type { TourProduct, TourPricingOption } from '../../types/product';
import { MatIcon } from '../desktop-primitives/MatIcon';
import { Card, CardHeader, Field, InfoRow, fmtFull, formatPrice, inputStyle } from './primitives';
import { ReservationShell } from './ReservationShell';
import { BookingSummary } from './BookingSummary';

interface PaymentDesktopProps {
    product: TourProduct;
    selectedStartDate: Date | null;
    endDate: Date | null;
    nights: number;
    days: number;
    totalPeople: number;
    baseOption: TourPricingOption | null;
    priceBreakdown: { total: number; deposit: number; local: number };
    customerInfo: { name: string; phone: string; email: string };
    setCustomerInfo: (info: { name: string; phone: string; email: string }) => void;
    memo: string;
    setMemo: (s: string) => void;
    agreeToTerms: boolean;
    setAgreeToTerms: (b: boolean) => void;
    isProcessing: boolean;
    fieldError: { field: string; msg: string } | null;
    onSubmit: () => void;
    onBack: () => void;
}

/**
 * Step 1 — reservation form + payment confirmation.
 * State lives in src/pages/Payment.tsx so mobile + desktop share the exact
 * same submit/email flow.
 */
export function PaymentDesktop({
    product,
    selectedStartDate,
    endDate,
    nights,
    days,
    totalPeople,
    baseOption,
    priceBreakdown,
    customerInfo,
    setCustomerInfo,
    memo,
    setMemo,
    agreeToTerms,
    setAgreeToTerms,
    isProcessing,
    fieldError,
    onSubmit,
    onBack,
}: PaymentDesktopProps) {
    const cleanTitle = product.name.replace(/^\[[^\]]+\]\s*/, '');
    const canSubmit = !isProcessing;

    const handleSubmit = () => {
        if (isProcessing) return;
        onSubmit();
    };

    return (
        <ReservationShell step={1} productName={product.name} onBack={onBack}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 380px',
                    gap: 28,
                    alignItems: 'flex-start',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {fieldError && (
                        <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
                            {fieldError.msg}
                        </div>
                    )}
                    {/* Selected tour info */}
                    <Card>
                        <CardHeader title="選択した旅行情報" eyebrow="Tour Info" />
                        <div style={{ padding: '0 28px 24px' }}>
                            <h3
                                style={{
                                    fontSize: 20,
                                    fontWeight: 700,
                                    color: 'var(--fg-1)',
                                    margin: '0 0 18px',
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                {cleanTitle}
                            </h3>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 14,
                                }}
                            >
                                <InfoRow
                                    icon="calendar_month"
                                    k="旅行期間"
                                    v={
                                        selectedStartDate && endDate
                                            ? `${fmtFull(selectedStartDate)} - ${fmtFull(endDate)}`
                                            : product.duration || '未選択'
                                    }
                                    sub={
                                        nights > 0 ? `${nights}泊${days}日` : product.duration
                                    }
                                />
                                <InfoRow
                                    icon="group"
                                    k="予約人数"
                                    v={`計 ${totalPeople} 名`}
                                    sub={
                                        baseOption
                                            ? `お1人様 ¥${formatPrice(baseOption.pricePerPerson)}`
                                            : undefined
                                    }
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Reservation form */}
                    <Card>
                        <CardHeader title="予約者情報" eyebrow="Booking Person" />
                        <div
                            style={{
                                padding: '0 28px 28px',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '20px 24px',
                            }}
                        >
                            <Field label="お名前" required>
                                <input
                                    value={customerInfo.name}
                                    onChange={(e) =>
                                        setCustomerInfo({ ...customerInfo, name: e.target.value })
                                    }
                                    placeholder="山田 太郎"
                                    style={inputStyle}
                                />
                            </Field>
                            <Field label="携帯電話番号" required>
                                <input
                                    value={customerInfo.phone}
                                    onChange={(e) =>
                                        setCustomerInfo({ ...customerInfo, phone: e.target.value })
                                    }
                                    placeholder="090-0000-0000"
                                    type="tel"
                                    style={inputStyle}
                                />
                            </Field>
                            <Field label="メールアドレス" required colSpan={2}>
                                <input
                                    value={customerInfo.email}
                                    onChange={(e) =>
                                        setCustomerInfo({ ...customerInfo, email: e.target.value })
                                    }
                                    placeholder="example@gmail.com"
                                    type="email"
                                    style={inputStyle}
                                />
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: 'var(--fg-5)',
                                        marginTop: 6,
                                    }}
                                >
                                    PayPal の請求書がこのメールアドレスに送信されます
                                </div>
                            </Field>
                            <Field label="ご要望・特記事項 (任意)" colSpan={2}>
                                <textarea
                                    value={memo}
                                    onChange={(e) => setMemo(e.target.value)}
                                    placeholder="食事のアレルギー、希望のオプション等がございましたらご記入ください"
                                    rows={4}
                                    style={{
                                        ...inputStyle,
                                        resize: 'vertical',
                                        minHeight: 96,
                                        lineHeight: 1.6,
                                    }}
                                />
                            </Field>
                        </div>
                    </Card>

                    {/* Payment amount */}
                    <Card>
                        <CardHeader title="決済金額" eyebrow="Payment" />
                        <div style={{ padding: '0 28px 24px' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '16px 0',
                                    borderBottom: '1px solid var(--border-subtle)',
                                }}
                            >
                                <span style={{ fontSize: 14, color: 'var(--fg-3)' }}>
                                    総旅行費用
                                </span>
                                <span
                                    style={{
                                        fontSize: 18,
                                        fontWeight: 700,
                                        color: 'var(--fg-1)',
                                    }}
                                >
                                    ¥{formatPrice(priceBreakdown.total)}
                                </span>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '16px 18px',
                                    margin: '12px 0',
                                    background: 'var(--primary-tint, rgba(15,118,110,0.08))',
                                    borderRadius: 12,
                                    border: '1px dashed #0f766e',
                                }}
                            >
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: 'var(--primary-dark, #115e59)',
                                    }}
                                >
                                    今すぐ決済する予約金
                                </span>
                                <span
                                    style={{
                                        fontSize: 22,
                                        fontWeight: 700,
                                        color: '#0f766e',
                                        letterSpacing: '-0.01em',
                                    }}
                                >
                                    ¥{formatPrice(priceBreakdown.deposit)}
                                </span>
                            </div>
                            {priceBreakdown.local > 0 && (
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '10px 0',
                                        fontSize: 14,
                                        color: 'var(--fg-3)',
                                    }}
                                >
                                    <span>現地支払い残金</span>
                                    <span
                                        style={{ fontWeight: 700, color: 'var(--fg-2)' }}
                                    >
                                        ¥{formatPrice(priceBreakdown.local)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Payment method */}
                    <Card>
                        <CardHeader
                            title="予約金のお支払いについて"
                            eyebrow="Payment Method"
                        />
                        <div style={{ padding: '0 28px 24px' }}>
                            <div
                                style={{
                                    padding: '20px 22px',
                                    background: '#f0f5ff',
                                    borderRadius: 14,
                                    border: '1px solid #dbe7ff',
                                    display: 'grid',
                                    gridTemplateColumns: '56px 1fr',
                                    gap: 18,
                                }}
                            >
                                <div
                                    style={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 14,
                                        background: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        border: '1px solid #dbe7ff',
                                    }}
                                >
                                    <MatIcon name="mail" size={28} color="#1e40af" />
                                </div>
                                <div>
                                    <div
                                        style={{
                                            fontSize: 16,
                                            fontWeight: 700,
                                            color: 'var(--fg-1)',
                                            marginBottom: 6,
                                            letterSpacing: '-0.01em',
                                        }}
                                    >
                                        PayPal 請求書 (Eメール)
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            color: 'var(--fg-3)',
                                            lineHeight: 1.7,
                                        }}
                                    >
                                        予約申し込み完了後、ご入力いただいたメールアドレス宛に
                                        PayPal の請求書をお送りいたします。
                                        <br />
                                        メール内のリンクから、クレジットカード等で安全にお支払いいただけます。
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: 8,
                                            marginTop: 14,
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        {[
                                            { i: 'credit_card', t: 'クレジットカード' },
                                            { i: 'payments', t: 'デビットカード' },
                                            { i: 'account_balance', t: 'PayPal 残高' },
                                        ].map((p) => (
                                            <span
                                                key={p.t}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    padding: '5px 10px',
                                                    background: '#fff',
                                                    borderRadius: 999,
                                                    fontSize: 11,
                                                    color: 'var(--fg-3)',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                <MatIcon
                                                    name={p.i}
                                                    size={14}
                                                    color="var(--fg-4)"
                                                />{' '}
                                                {p.t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div
                                style={{
                                    marginTop: 18,
                                    padding: '16px 20px',
                                    background: 'var(--bg-muted)',
                                    borderRadius: 12,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        marginBottom: 12,
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: 'var(--fg-1)',
                                    }}
                                >
                                    <MatIcon name="info" size={16} color="var(--fg-3)" /> 入金時の注意事項
                                </div>
                                <ul
                                    style={{
                                        margin: 0,
                                        paddingLeft: 18,
                                        fontSize: 12,
                                        color: 'var(--fg-4)',
                                        lineHeight: 1.85,
                                    }}
                                >
                                    <li>請求書メールにお支払い期限が記載されています。期限内に決済をお願いします。</li>
                                    <li>24時間以内に入金がない場合、予約は自動的にキャンセルされます。</li>
                                    <li>
                                        お支払いに関するご質問は{' '}
                                        <strong style={{ color: 'var(--fg-2)' }}>
                                            payment.japan_support@milkywayjapan.com
                                        </strong>{' '}
                                        までご連絡ください。
                                    </li>
                                    <li>現地残金は旅行当日にガイドへ直接お渡しください。</li>
                                </ul>
                            </div>
                        </div>
                    </Card>

                    {/* Cancellation */}
                    <Card>
                        <CardHeader title="キャンセル規定" eyebrow="Cancellation Policy" />
                        <div style={{ padding: '0 28px 24px' }}>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(4, 1fr)',
                                    gap: 10,
                                }}
                            >
                                {[
                                    { range: '出発 31 日前まで', fee: '全額返金', tone: 'ok' as const },
                                    { range: '30 〜 15 日前', fee: '30%', tone: 'warn' as const },
                                    { range: '14 〜 8 日前', fee: '50%', tone: 'warn' as const },
                                    { range: '7 日前以降', fee: '100%', tone: 'bad' as const },
                                ].map((c) => (
                                    <div
                                        key={c.range}
                                        style={{
                                            padding: '14px 16px',
                                            borderRadius: 12,
                                            background:
                                                c.tone === 'ok'
                                                    ? 'var(--primary-tint, rgba(15,118,110,0.08))'
                                                    : c.tone === 'warn'
                                                        ? '#fef3c7'
                                                        : '#fee2e2',
                                            border:
                                                '1px solid ' +
                                                (c.tone === 'ok'
                                                    ? 'var(--primary-soft, rgba(15,118,110,0.18))'
                                                    : c.tone === 'warn'
                                                        ? '#fde68a'
                                                        : '#fecaca'),
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 11,
                                                color: 'var(--fg-4)',
                                                marginBottom: 6,
                                            }}
                                        >
                                            {c.range}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 15,
                                                fontWeight: 700,
                                                color:
                                                    c.tone === 'ok'
                                                        ? 'var(--primary-dark, #115e59)'
                                                        : c.tone === 'warn'
                                                            ? '#92400e'
                                                            : '#991b1b',
                                                letterSpacing: '-0.01em',
                                            }}
                                        >
                                            {c.fee}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* Agree */}
                    <div
                        style={{
                            padding: '20px 24px',
                            background: '#fff',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            boxShadow: 'var(--shadow-toss)',
                        }}
                    >
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                cursor: 'pointer',
                                flex: 1,
                                userSelect: 'none',
                            }}
                        >
                            <span
                                style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 6,
                                    border:
                                        '1.5px solid ' + (agreeToTerms ? '#0f766e' : 'var(--border-strong)'),
                                    background: agreeToTerms ? '#0f766e' : '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                {agreeToTerms && <MatIcon name="check" size={16} color="#fff" />}
                            </span>
                            <input
                                type="checkbox"
                                checked={agreeToTerms}
                                onChange={() => setAgreeToTerms(!agreeToTerms)}
                                style={{ display: 'none' }}
                            />
                            <span
                                style={{
                                    fontSize: 14,
                                    color: 'var(--fg-2)',
                                    lineHeight: 1.55,
                                }}
                            >
                                <strong style={{ color: 'var(--fg-1)', fontWeight: 700 }}>
                                    注文内容を確認し、決済に同意します。
                                </strong>
                                <span style={{ color: 'var(--fg-5)', marginLeft: 8 }}>
                                    <a
                                        href="/terms-of-service"
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                            color: 'var(--fg-3)',
                                            textDecoration: 'underline',
                                        }}
                                    >
                                        利用規約
                                    </a>{' '}
                                    ・
                                    <a
                                        href="/privacy-policy"
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                            color: 'var(--fg-3)',
                                            textDecoration: 'underline',
                                            marginLeft: 6,
                                        }}
                                    >
                                        個人情報処理方針
                                    </a>{' '}
                                    に同意します。
                                </span>
                            </span>
                        </label>
                    </div>
                </div>

                {/* Right summary */}
                <BookingSummary
                    product={product}
                    selectedStartDate={selectedStartDate}
                    endDate={endDate}
                    nights={nights}
                    days={days}
                    people={totalPeople}
                    baseOption={baseOption}
                    total={priceBreakdown.total}
                    deposit={priceBreakdown.deposit}
                    local={priceBreakdown.local}
                    ctaLabel={
                        isProcessing
                            ? '処理中...'
                            : `¥${formatPrice(priceBreakdown.deposit)} 決済する`
                    }
                    ctaIcon="receipt_long"
                    onCta={handleSubmit}
                    canProceed={canSubmit}
                    canProceedHint={
                        fieldError?.msg || null
                    }
                />
            </div>
        </ReservationShell>
    );
}
