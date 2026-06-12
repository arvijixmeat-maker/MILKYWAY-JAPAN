import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { sendNotificationEmail } from '../../lib/email';
import { MatIcon } from '../desktop-primitives/MatIcon';
import { PageHero } from '../desktop-primitives/PageHero';

const DESTINATIONS = [
    { v: '中央モンゴル', emoji: '🏞️' },
    { v: 'ゴビ砂漠', emoji: '🏜️' },
    { v: 'フブスグル湖', emoji: '🏔️' },
    { v: 'テレルジ国立公園', emoji: '🐎' },
    { v: 'トレッキング', emoji: '🥾' },
    { v: 'ゴルフ', emoji: '⛳' },
];

const TRAVEL_TYPES = [
    { v: 'ヒーリング', emoji: '🧘' },
    { v: 'アクティビティ', emoji: '🏃' },
    { v: 'グルメ', emoji: '🍽️' },
    { v: 'ホカンス', emoji: '🏨' },
    { v: '映え', emoji: '📸' },
    { v: '星空・天体', emoji: '🌌' },
];

const ACCOMMODATIONS = [
    { v: '5つ星ホテル', icon: 'hotel' },
    { v: '4つ星ホテル', icon: 'hotel' },
    { v: '3つ星ホテル', icon: 'hotel' },
    { v: 'デラックスゲル', icon: 'cottage' },
    { v: 'スタンダードゲル', icon: 'cottage' },
];

const VEHICLES = [
    { v: 'スタレックス (4-7名)', sub: '快適 ・ 一般的' },
    { v: 'プルゴン (4名)', sub: 'モンゴル伝統車' },
    { v: 'ハイエース (8-12名)', sub: '大人数対応' },
    { v: '大型バス (15名以上)', sub: 'グループ向け' },
];

export function CustomEstimateDesktop({ contentWidth = 1280 }: { contentWidth?: number }) {
    const navigate = useNavigate();

    const [destinations, setDestinations] = useState<string[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [adultCount, setAdultCount] = useState(2);
    const [childCount, setChildCount] = useState(0);
    const [themes, setThemes] = useState<string[]>([]);
    const [accommodations, setAccommodations] = useState<string[]>([]);
    const [vehicle, setVehicle] = useState('');
    const [priceRange, setPriceRange] = useState(50);
    const [additionalRequest, setAdditionalRequest] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Prefill from logged-in user
    useEffect(() => {
        api.auth.me().then((me: { name?: string; phone?: string; email?: string } | null) => {
            if (me) {
                if (me.name) setName(me.name);
                if (me.phone) setPhone(me.phone);
                if (me.email) setEmail(me.email);
            }
        }).catch(() => {});
    }, []);

    const toggle = (arr: string[], setter: (v: string[]) => void, val: string) => {
        setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
    };

    const canSubmit = destinations.length > 0 && startDate && endDate && name && (phone || email);

    const handleSubmit = async () => {
        if (!canSubmit || submitting) return;
        setSubmitting(true);
        try {
            const me: { id?: string } | null = await api.auth.me().catch(() => null);
            const newEstimate = {
                user_id: me?.id || null,
                type: 'personal',
                status: 'new',
                name,
                phone,
                email,
                destination: destinations.join(', '),
                period: `${startDate} ~ ${endDate}`,
                headcount: `大人 ${adultCount}名${childCount > 0 ? `, 子供 ${childCount}名` : ''}`,
                budget: `${priceRange}万円`,
                travel_types: themes,
                accommodations,
                vehicle,
                additional_request: additionalRequest,
                created_at: new Date().toISOString(),
            };

            const data: { id?: string } = await api.quotes.create(newEstimate);
            try {
                await sendNotificationEmail(email, 'QUOTE_RECEIVED', {
                    customerName: name,
                    productName: `モンゴルオーダーメイド旅行 (${newEstimate.period})`,
                });
            } catch {
                // email is non-fatal
            }
            navigate('/estimate-complete', { state: { id: data?.id || '', ...newEstimate } });
        } catch (e) {
            console.error('[quote create]', e);
            alert('送信に失敗しました。しばらくしてからもう一度お試しください。');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ background: '#fff' }}>
            <PageHero
                eyebrow="Custom Tour Request"
                title="オーダーメイド見積もり"
                subtitle="人数・期間・予算・行きたい場所をお伝えください。日本語スタッフが24時間以内に最適なプランをお見積もりします。"
                breadcrumbs={[
                    { label: 'ホーム', path: '/' },
                    { label: 'お見積もり' },
                ]}
                contentWidth={contentWidth}
            />

            <section style={{ maxWidth: contentWidth, margin: '0 auto', padding: '40px 32px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 48, alignItems: 'start' }}>
                    {/* Form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
                        <FormSection number="01" title="行きたい場所" hint="複数選択可">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                {DESTINATIONS.map((d) => {
                                    const on = destinations.includes(d.v);
                                    return (
                                        <button
                                            key={d.v}
                                            type="button"
                                            onClick={() => toggle(destinations, setDestinations, d.v)}
                                            style={chipBtn(on)}
                                        >
                                            <span style={{ fontSize: 22 }}>{d.emoji}</span>
                                            <span>{d.v}</span>
                                            {on && (
                                                <span style={checkMark}>
                                                    <MatIcon name="check" size={14} color="#fff" />
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </FormSection>

                        <FormSection number="02" title="旅行期間" hint="出発日と帰国日を選択">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <DateField label="出発日" value={startDate} onChange={setStartDate} />
                                <DateField label="帰国日" value={endDate} onChange={setEndDate} />
                            </div>
                        </FormSection>

                        <FormSection number="03" title="参加人数">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <Counter label="大人" value={adultCount} onChange={setAdultCount} min={1} />
                                <Counter label="子供" value={childCount} onChange={setChildCount} min={0} />
                            </div>
                        </FormSection>

                        <FormSection number="04" title="旅行スタイル" hint="複数選択可">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                {TRAVEL_TYPES.map((t) => {
                                    const on = themes.includes(t.v);
                                    return (
                                        <button key={t.v} type="button" onClick={() => toggle(themes, setThemes, t.v)} style={chipBtn(on)}>
                                            <span style={{ fontSize: 22 }}>{t.emoji}</span>
                                            <span>{t.v}</span>
                                            {on && (
                                                <span style={checkMark}>
                                                    <MatIcon name="check" size={14} color="#fff" />
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </FormSection>

                        <FormSection number="05" title="宿泊タイプ" hint="複数選択可">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                {ACCOMMODATIONS.map((a) => {
                                    const on = accommodations.includes(a.v);
                                    return (
                                        <button
                                            key={a.v}
                                            type="button"
                                            onClick={() => toggle(accommodations, setAccommodations, a.v)}
                                            style={chipBtn(on)}
                                        >
                                            <MatIcon name={a.icon} size={22} color={on ? '#0f766e' : 'var(--fg-3)'} />
                                            <span>{a.v}</span>
                                            {on && (
                                                <span style={checkMark}>
                                                    <MatIcon name="check" size={14} color="#fff" />
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </FormSection>

                        <FormSection number="06" title="車両タイプ">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {VEHICLES.map((v) => {
                                    const on = vehicle === v.v;
                                    return (
                                        <button
                                            key={v.v}
                                            type="button"
                                            onClick={() => setVehicle(v.v)}
                                            style={{
                                                padding: '16px 18px',
                                                border: on ? '2px solid #0f766e' : '1px solid var(--border)',
                                                background: on ? 'var(--primary-tint)' : '#fff',
                                                borderRadius: 14,
                                                cursor: 'pointer',
                                                fontFamily: 'inherit',
                                                textAlign: 'left',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 14,
                                            }}
                                        >
                                            <MatIcon name="directions_car" size={24} color={on ? '#0f766e' : 'var(--fg-3)'} />
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>{v.v}</div>
                                                <div style={{ fontSize: 12, color: 'var(--fg-5)', marginTop: 2 }}>{v.sub}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </FormSection>

                        <FormSection number="07" title="ご予算" hint="お一人様あたり (万円)">
                            <div style={{ padding: '4px 2px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 14 }}>
                                    <span style={{ fontSize: 22, fontWeight: 700, color: '#0f766e', letterSpacing: '-0.01em' }}>
                                        {priceRange} 万円
                                    </span>
                                    <span style={{ color: 'var(--fg-5)' }}>目安</span>
                                </div>
                                <input
                                    type="range"
                                    min={10}
                                    max={500}
                                    step={5}
                                    value={priceRange}
                                    onChange={(e) => setPriceRange(parseInt(e.target.value, 10))}
                                    style={{ width: '100%', accentColor: '#0f766e' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-5)', marginTop: 6 }}>
                                    <span>10 万円</span>
                                    <span>500 万円+</span>
                                </div>
                            </div>
                        </FormSection>

                        <FormSection number="08" title="ご要望" hint="希望日程・含めたい体験など (任意)">
                            <textarea
                                value={additionalRequest}
                                onChange={(e) => setAdditionalRequest(e.target.value)}
                                rows={5}
                                placeholder="例: 8月の連休に行きたい / 子供連れでゲル宿泊メイン / 撮影スポットを多めに..."
                                style={{
                                    width: '100%',
                                    padding: '14px 18px',
                                    border: '1px solid var(--border)',
                                    borderRadius: 14,
                                    fontSize: 14,
                                    color: 'var(--fg-1)',
                                    fontFamily: 'inherit',
                                    lineHeight: 1.7,
                                    resize: 'vertical',
                                    outline: 'none',
                                }}
                            />
                        </FormSection>

                        <FormSection number="09" title="ご連絡先" hint="お見積もりの送付先">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <TextField label="お名前" value={name} onChange={setName} placeholder="山田 太郎" required />
                                <TextField label="お電話番号" value={phone} onChange={setPhone} placeholder="090-1234-5678" />
                            </div>
                            <div style={{ marginTop: 14 }}>
                                <TextField label="メールアドレス" value={email} onChange={setEmail} placeholder="info@example.com" type="email" />
                            </div>
                        </FormSection>
                    </div>

                    {/* Sticky summary */}
                    <aside style={{ position: 'sticky', top: 156, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div
                            style={{
                                background: '#fff',
                                border: '1px solid var(--border)',
                                borderRadius: 20,
                                padding: 24,
                                boxShadow: '0 12px 32px -8px rgba(0,0,0,0.1)',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    letterSpacing: '0.08em',
                                    color: '#0f766e',
                                    textTransform: 'uppercase',
                                    marginBottom: 14,
                                }}
                            >
                                Your Request
                            </div>
                            <SummaryRow label="行き先" value={destinations.length > 0 ? destinations.join(', ') : '未選択'} />
                            <SummaryRow label="期間" value={startDate && endDate ? `${startDate} 〜 ${endDate}` : '未選択'} />
                            <SummaryRow label="人数" value={`大人 ${adultCount}名${childCount > 0 ? `, 子供 ${childCount}名` : ''}`} />
                            <SummaryRow label="予算" value={`${priceRange} 万円`} />
                            {themes.length > 0 && <SummaryRow label="スタイル" value={themes.join(', ')} />}

                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={!canSubmit || submitting}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    marginTop: 20,
                                    background: canSubmit ? '#0f766e' : 'var(--bg-muted)',
                                    color: canSubmit ? '#fff' : 'var(--fg-5)',
                                    border: 'none',
                                    borderRadius: 12,
                                    fontSize: 15,
                                    fontWeight: 700,
                                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                                    fontFamily: 'inherit',
                                    boxShadow: canSubmit ? '0 8px 20px -6px rgba(15,118,110,0.5)' : 'none',
                                }}
                            >
                                {submitting ? '送信中...' : '見積もりを依頼する'}
                            </button>

                            <div
                                style={{
                                    marginTop: 14,
                                    padding: '12px 14px',
                                    background: 'var(--primary-tint)',
                                    borderRadius: 10,
                                    fontSize: 12,
                                    color: 'var(--primary-dark)',
                                    display: 'flex',
                                    gap: 8,
                                    alignItems: 'flex-start',
                                    lineHeight: 1.55,
                                }}
                            >
                                <MatIcon name="verified" size={16} filled color="var(--primary-dark)" />
                                <span>
                                    <strong>無料・拘束なし</strong> — 24時間以内に日本語スタッフからご返信します。
                                </span>
                            </div>
                        </div>

                        <div style={{ background: 'var(--bg-muted)', borderRadius: 16, padding: 18, fontSize: 12, color: 'var(--fg-4)', lineHeight: 1.7 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 8 }}>お電話でもOK</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <MatIcon name="phone" size={16} color="#0f766e" />
                                <a href="tel:+97695945838" style={{ color: 'var(--fg-2)', textDecoration: 'none', fontWeight: 700 }}>
                                    +976 9594 5838
                                </a>
                            </div>
                            <div style={{ marginTop: 4 }}>平日 9:00-18:00 (JST)</div>
                        </div>
                    </aside>
                </div>
            </section>

            <div style={{ height: 96 }} />
        </div>
    );
}

function FormSection({ number, title, hint, children }: { number: string; title: string; hint?: string; children: React.ReactNode }) {
    return (
        <section>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 18 }}>
                <span
                    style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#0f766e',
                        fontFamily: 'ui-monospace, Menlo, monospace',
                        letterSpacing: '0.04em',
                    }}
                >
                    {number}
                </span>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-1)', margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
                {hint && <span style={{ fontSize: 12, color: 'var(--fg-5)', marginBottom: 4 }}>{hint}</span>}
            </div>
            {children}
        </section>
    );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 12, color: 'var(--fg-5)', marginBottom: 8, fontWeight: 600 }}>{label}</span>
            <input
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    padding: '14px 16px',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    fontSize: 14,
                    color: 'var(--fg-1)',
                    fontFamily: 'inherit',
                    outline: 'none',
                }}
            />
        </label>
    );
}

function TextField({
    label,
    value,
    onChange,
    placeholder,
    required,
    type = 'text',
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    required?: boolean;
    type?: 'text' | 'email' | 'tel';
}) {
    return (
        <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 12, color: 'var(--fg-5)', marginBottom: 8, fontWeight: 600 }}>
                {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
            </span>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    padding: '14px 16px',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    fontSize: 14,
                    color: 'var(--fg-1)',
                    fontFamily: 'inherit',
                    outline: 'none',
                }}
            />
        </label>
    );
}

function Counter({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
    return (
        <div>
            <span style={{ fontSize: 12, color: 'var(--fg-5)', marginBottom: 8, fontWeight: 600, display: 'block' }}>{label}</span>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 8px 8px 18px',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    background: '#fff',
                }}
            >
                <span style={{ fontSize: 16, color: 'var(--fg-1)', fontWeight: 700 }}>{value} 名</span>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button
                        type="button"
                        onClick={() => onChange(Math.max(min, value - 1))}
                        aria-label="decrease"
                        style={stepBtn}
                    >
                        <MatIcon name="remove" size={16} color="var(--fg-2)" />
                    </button>
                    <button type="button" onClick={() => onChange(value + 1)} aria-label="increase" style={stepBtn}>
                        <MatIcon name="add" size={16} color="var(--fg-2)" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '70px 1fr',
                gap: 12,
                fontSize: 13,
                marginBottom: 10,
                alignItems: 'baseline',
            }}
        >
            <span style={{ color: 'var(--fg-5)', fontSize: 11, fontWeight: 600 }}>{label}</span>
            <span
                style={{
                    color: 'var(--fg-1)',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                }}
            >
                {value}
            </span>
        </div>
    );
}

function chipBtn(on: boolean): CSSProperties {
    return {
        position: 'relative',
        padding: '20px 16px',
        background: on ? 'var(--primary-tint)' : '#fff',
        border: on ? '2px solid #0f766e' : '1px solid var(--border)',
        borderRadius: 14,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 600,
        color: on ? 'var(--primary-dark)' : 'var(--fg-2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        transition: 'all 150ms',
    };
}

const checkMark: CSSProperties = {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 999,
    background: '#0f766e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const stepBtn: CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};
