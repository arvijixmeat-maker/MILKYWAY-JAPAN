import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { sendNotificationEmail } from '../../lib/email';
import { useSpotImages } from '../../hooks/useSpotImages';
import { useProductCategories } from '../../hooks/useProductCategories';
import { MW, MW_FONT_EN, MW_GRADIENT, MW_STICKY_TOP, isUsableImage } from '../desktop-primitives/mwTokens';

/** Destination cards; `spot` keywords pick a photo from the admin tourist-spot library. */
const DESTINATIONS = [
    { v: '中央モンゴル', spot: ['大草原'] },
    { v: 'ゴビ砂漠', spot: ['ホンゴル砂丘', 'ゴビ'] },
    { v: 'フブスグル湖', spot: ['フブスグル'] },
    { v: 'テレルジ国立公園', spot: ['テレルジ'] },
    { v: 'トレッキング', spot: ['ハイキング', '登山'] },
    { v: 'ゴルフ', spot: ['ゴルフ'] },
];
const TRAVEL_TYPES = ['ヒーリング', 'アクティビティ', 'グルメ', 'ホカンス', '映え', '星空・天体'];
const ACCOMMODATIONS = ['5つ星ホテル', '4つ星ホテル', '3つ星ホテル', 'デラックスゲル', 'スタンダードゲル'];
const VEHICLES = [
    { v: 'スタレックス (4-7名)', sub: '快適・一般的' },
    { v: 'プルゴン (4名)', sub: 'モンゴル伝統車' },
    { v: 'ハイエース (8-12名)', sub: '大人数対応' },
    { v: '大型バス (15名以上)', sub: 'グループ向け' },
];

/** Hero scenes; a scene is shown only when its tourist-spot photo exists. */
const SCENES = [
    { key: 'mongolia', pre: '私だけの', accent: 'モンゴル旅行', post: '', sub: '草原と砂漠、そして星空へ', spot: ['大草原'], idx: 0 },
    { key: 'takeoff', pre: 'モンゴルへ', accent: '出発', post: '', sub: '東京からウランバートルまで、いちばんワクワクするフライト', spot: ['大草原'], idx: 1 },
    { key: 'horse', pre: 'テレルジ', accent: '草原乗馬', post: '', sub: '緑の大草原を、ゆったり駆ける時間', spot: ['乗馬体験'], idx: 0 },
    { key: 'desert', pre: 'ミニ砂漠の', accent: '一日', post: '', sub: 'エルスンタサルハイで、ラクダと砂漠に出会う', spot: ['ラクダ'], idx: 0 },
    { key: 'nomad', pre: '遊牧民の', accent: '文化体験', post: '', sub: 'ゲルで出会う、あたたかなモンゴルの日常', spot: ['遊牧民'], idx: 0 },
    { key: 'stars', pre: '砂漠の夜、', accent: '天の川', post: '', sub: 'モンゴルで出会う、いちばん特別な星空', spot: ['星空'], idx: 0 },
    { key: 'ready', pre: 'さあ、', accent: 'モンゴル', post: 'へ旅立つ準備', sub: 'ご希望の日程で、あなただけのプライベート旅行を', spot: ['テレルジ'], idx: 0 },
];

const WEEK = '日月火水木金土';
const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** 2026-10-03 → 2026年10月3日（土） */
const jpDate = (v: string) => {
    if (!v) return '';
    const [y, m, d] = v.split('-').map(Number);
    return `${y}年${m}月${d}日（${WEEK[new Date(y, m - 1, d).getDay()]}）`;
};
const EMAIL_RE = /.+@.+\..+/;

type CalKind = 'start' | 'end';

export function CustomEstimateDesktop() {
    const navigate = useNavigate();
    const { pick } = useSpotImages();
    const categories = useProductCategories();

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
    const [done, setDone] = useState<Record<string, unknown> | null>(null);
    const [cal, setCal] = useState<CalKind | null>(null);

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

    const people = `大人 ${adultCount}名${childCount > 0 ? ` / 子供 ${childCount}名` : ''}`;
    const budgetLabel = priceRange >= 500 ? '500 万円+' : `${priceRange} 万円`;
    const period = startDate || endDate ? `${jpDate(startDate) || '未定'} 〜 ${jpDate(endDate) || '未定'}` : '未選択';
    const canSubmit = destinations.length > 0 && !!name.trim() && EMAIL_RE.test(email.trim());

    const steps = [
        destinations.length > 0,
        !!startDate,
        true,
        themes.length > 0,
        accommodations.length > 0,
        !!vehicle,
        true,
        !!additionalRequest.trim(),
        !!name.trim() && EMAIL_RE.test(email.trim()),
    ];
    const doneCount = steps.filter(Boolean).length;

    const handleSubmit = async () => {
        if (!canSubmit || submitting) return;
        setSubmitting(true);
        try {
            const me: { id?: string } | null = await api.auth.me().catch(() => null);
            const newEstimate = {
                user_id: me?.id || null,
                type: 'personal',
                status: 'new',
                name: name.trim(),
                phone,
                email: email.trim(),
                destination: destinations.join(', '),
                period: startDate || endDate ? `${startDate || '未定'} ~ ${endDate || '未定'}` : '未定',
                headcount: `大人 ${adultCount}名${childCount > 0 ? `, 子供 ${childCount}名` : ''}`,
                budget: priceRange >= 500 ? '500万円以上' : `${priceRange}万円`,
                travel_types: themes,
                accommodations,
                vehicle,
                additional_request: additionalRequest,
                created_at: new Date().toISOString(),
            };

            const data: { id?: string } = await api.quotes.create(newEstimate);
            try {
                await sendNotificationEmail(newEstimate.email, 'QUOTE_RECEIVED', {
                    customerName: newEstimate.name,
                    productName: `モンゴルオーダーメイド旅行 (${newEstimate.period})`,
                });
            } catch {
                // email is non-fatal
            }
            setDone({ id: data?.id || '', ...newEstimate });
        } catch (e) {
            console.error('[quote create]', e);
            alert('送信に失敗しました。しばらくしてからもう一度お試しください。');
        } finally {
            setSubmitting(false);
        }
    };

    const scenes = SCENES.map((s) => ({ ...s, img: pick(s.spot, s.idx) })).filter((s) => isUsableImage(s.img));

    return (
        <div style={{ background: '#fff' }}>
            <QuoteHero scenes={scenes.length > 0 ? scenes : [{ ...SCENES[0], img: '' }]} onHome={() => navigate('/')} />

            <section style={{ background: '#FFFFFF' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px 104px', display: 'flex', gap: 56, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <Step n={1} done={steps[0]} title="行きたい場所" hint="複数選択可">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                                {DESTINATIONS.map((d) => {
                                    const on = destinations.includes(d.v);
                                    const img = pick(d.spot);
                                    return (
                                        <button
                                            key={d.v}
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() => toggle(destinations, setDestinations, d.v)}
                                            style={{
                                                position: 'relative',
                                                aspectRatio: '4/3',
                                                padding: 0,
                                                borderRadius: 16,
                                                overflow: 'hidden',
                                                border: 0,
                                                outline: `3px solid ${on ? MW.mint : MW.line2}`,
                                                outlineOffset: -3,
                                                background: isUsableImage(img) ? '#DDE2DF' : `linear-gradient(135deg, ${MW.navySoft} 0%, ${MW.mintDeep} 100%)`,
                                                cursor: 'pointer',
                                                color: '#fff',
                                                textAlign: 'left',
                                            }}
                                        >
                                            {isUsableImage(img) && (
                                                <img src={img} alt="" loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                            )}
                                            <span style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg,rgba(0,0,0,0) 45%,rgba(0,0,0,0.65) 100%)' }} />
                                            <span style={{ position: 'absolute', right: 10, top: 10, width: 26, height: 26, borderRadius: '50%', boxSizing: 'border-box', border: '2px solid #fff', background: on ? MW.mint : 'transparent', color: MW.navy, fontSize: 13, lineHeight: '22px', textAlign: 'center' }}>
                                                {on ? '✓' : ''}
                                            </span>
                                            <span style={{ position: 'absolute', left: 14, bottom: 12, fontSize: 15, fontWeight: 700 }}>{d.v}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </Step>

                        <Step n={2} done={steps[1]} title="旅行期間" hint="出発日と帰国日を選択">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                                <DateField label="出発日" value={startDate} active={cal === 'start'} onClick={() => setCal(cal === 'start' ? null : 'start')} />
                                <DateField label="帰国日" value={endDate} active={cal === 'end'} onClick={() => setCal(cal === 'end' ? null : 'end')} />
                                {cal && (
                                    <Calendar
                                        kind={cal}
                                        start={startDate}
                                        end={endDate}
                                        onPick={(v) => {
                                            if (cal === 'start') {
                                                setStartDate(v);
                                                if (endDate && endDate < v) setEndDate('');
                                                setCal('end');
                                            } else {
                                                setEndDate(v);
                                                setCal(null);
                                            }
                                        }}
                                        onClear={() => {
                                            if (cal === 'start') {
                                                setStartDate('');
                                                setEndDate('');
                                            } else {
                                                setEndDate('');
                                            }
                                        }}
                                        onClose={() => setCal(null)}
                                    />
                                )}
                            </div>
                        </Step>

                        <Step n={3} done={steps[2]} title="参加人数">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,280px))', gap: 12 }}>
                                <Counter label="大人" value={adultCount} onChange={(v) => setAdultCount(Math.min(30, Math.max(1, v)))} />
                                <Counter label="子供" value={childCount} onChange={(v) => setChildCount(Math.min(30, Math.max(0, v)))} />
                            </div>
                        </Step>

                        <Step n={4} done={steps[3]} title="旅行スタイル" hint="複数選択可">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {TRAVEL_TYPES.map((v) => (
                                    <Pill key={v} on={themes.includes(v)} onClick={() => toggle(themes, setThemes, v)}>{v}</Pill>
                                ))}
                            </div>
                        </Step>

                        <Step n={5} done={steps[4]} title="宿泊タイプ" hint="複数選択可">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {ACCOMMODATIONS.map((v) => (
                                    <Pill key={v} on={accommodations.includes(v)} onClick={() => toggle(accommodations, setAccommodations, v)}>{v}</Pill>
                                ))}
                            </div>
                        </Step>

                        <Step n={6} done={steps[5]} title="車両タイプ">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
                                {VEHICLES.map((o) => {
                                    const on = vehicle === o.v;
                                    return (
                                        <button
                                            key={o.v}
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() => setVehicle(on ? '' : o.v)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 72, padding: '14px 18px', borderRadius: 14, border: `1.5px solid ${on ? MW.mint : MW.line2}`, background: on ? MW.mintTint : '#FFFFFF', cursor: 'pointer', textAlign: 'left', color: MW.navy, transition: 'all .15s', fontFamily: 'inherit' }}
                                        >
                                            <Check on={on} size={20} />
                                            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <span style={{ fontSize: 15, fontWeight: 700 }}>{o.v}</span>
                                                <span style={{ fontSize: 12, color: MW.mute }}>{o.sub}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </Step>

                        <Step n={7} done={steps[6]} title="ご予算" hint="お一人様あたり">
                            <div style={{ background: '#fff', border: `1.5px solid ${MW.line2}`, borderRadius: 16, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: MW.mute }}>目安</span>
                                    <span style={{ fontSize: 30, fontWeight: 900, color: MW.mintDeep }}>{budgetLabel}</span>
                                </div>
                                <input
                                    type="range"
                                    min={10}
                                    max={500}
                                    step={10}
                                    value={priceRange}
                                    onChange={(e) => setPriceRange(Number(e.target.value))}
                                    aria-label="ご予算（お一人様あたり）"
                                    style={{ width: '100%', margin: 0, accentColor: MW.mint }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: MW.mute }}>
                                    <span>10 万円</span>
                                    <span>500 万円+</span>
                                </div>
                            </div>
                        </Step>

                        <Step n={8} done={steps[7]} title="ご要望" hint="任意">
                            <textarea
                                rows={5}
                                value={additionalRequest}
                                onChange={(e) => setAdditionalRequest(e.target.value)}
                                placeholder="例: 8月の連休に行きたい / 子供連れでゲル宿泊メイン / 撮影スポットを多めに..."
                                style={{ ...field, height: 'auto', padding: '16px 18px', lineHeight: 1.7, resize: 'vertical' }}
                            />
                        </Step>

                        <Step n={9} done={steps[8]} title="ご連絡先" hint="お見積もりの送付先" last>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                                <Labeled label="お名前" required>
                                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="山田 花子" autoComplete="name" style={field} />
                                </Labeled>
                                <Labeled label="お電話番号">
                                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="090-1234-5678" autoComplete="tel" style={field} />
                                </Labeled>
                            </div>
                            <Labeled label="メールアドレス" required>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" autoComplete="email" style={field} />
                            </Labeled>
                        </Step>
                    </div>

                    <TravelPass
                        passenger={name.trim() ? `${name.trim()} 様` : '旅行者様'}
                        people={people}
                        depart={startDate ? jpDate(startDate).replace(/（.）$/, '') : 'ご希望の日'}
                        budget={budgetLabel}
                        places={destinations.join('・') || '未選択'}
                        styles={themes.join('・') || '未選択'}
                        progress={doneCount}
                        canSubmit={canSubmit}
                        submitting={submitting}
                        onSubmit={handleSubmit}
                    />
                </div>
            </section>

            {done && (
                <DoneModal
                    places={destinations.join('・') || '未選択'}
                    period={period}
                    people={people}
                    categories={categories.slice(0, 3)}
                    onClose={() => setDone(null)}
                    onStatus={() => navigate('/estimate-complete', { state: done })}
                    go={(path) => navigate(path)}
                />
            )}
        </div>
    );
}

function QuoteHero({ scenes, onHome }: { scenes: ((typeof SCENES)[number] & { img: string })[]; onHome: () => void }) {
    const [idx, setIdx] = useState(0);
    const paused = useRef(false);
    const n = scenes.length;

    useEffect(() => {
        if (n <= 1) return;
        const t = window.setInterval(() => {
            if (!paused.current && document.visibilityState === 'visible') setIdx((i) => (i + 1) % n);
        }, 5000);
        return () => window.clearInterval(t);
    }, [n]);

    const active = idx % n;
    const cur = scenes[active];

    return (
        <section
            onMouseEnter={() => { paused.current = true; }}
            onMouseLeave={() => { paused.current = false; }}
            style={{ position: 'relative', background: MW.navySoft, color: '#fff', overflow: 'hidden' }}
        >
            {scenes.map((s, k) => (
                <div key={s.key} style={{ position: 'absolute', inset: 0, opacity: k === active ? 1 : 0, transition: 'opacity .9s ease' }}>
                    {isUsableImage(s.img) && (
                        <img src={s.img} alt="" loading={k === 0 ? 'eager' : 'lazy'} decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    )}
                </div>
            ))}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(90deg,rgba(10,31,46,0.82) 0%,rgba(10,31,46,0.5) 45%,rgba(10,31,46,0.1) 100%)' }} />
            <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '28px 24px 36px', minHeight: 'clamp(380px,38vw,460px)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 40 }}>
                <nav aria-label="パンくずリスト" style={{ display: 'flex', gap: 8, fontSize: 13, color: '#C4D0D8' }}>
                    <a href="/" onClick={(e) => { e.preventDefault(); onHome(); }} style={{ color: '#C4D0D8', textDecoration: 'none' }}>ホーム</a>
                    <span>›</span>
                    <span style={{ color: '#fff', fontWeight: 700 }}>お見積もり</span>
                </nav>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
                    <h1 style={{ margin: 0, fontSize: 'clamp(34px,4.6vw,52px)', fontWeight: 900, lineHeight: 1.2 }}>オーダーメイド見積もり</h1>
                    <p style={{ margin: 0, fontSize: 16, lineHeight: 1.8, color: '#D8E1E7' }}>
                        人数・期間・予算・行きたい場所をお伝えください。日本語スタッフが24時間以内に最適なプランをお見積もりします。
                    </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
                    <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 14, borderLeft: '3px solid #3FC2A4' }}>
                        <span style={{ fontSize: 18, fontWeight: 900 }}>
                            {cur.pre}<span style={{ color: MW.mintLight }}>{cur.accent}</span>{cur.post}
                        </span>
                        <span style={{ fontSize: 13, color: '#C4D0D8' }}>{cur.sub}</span>
                    </div>
                    {n > 1 && (
                        <div style={{ display: 'flex', gap: 6 }}>
                            {scenes.map((s, k) => (
                                <button
                                    key={s.key}
                                    type="button"
                                    aria-label={`シーン ${k + 1}`}
                                    aria-current={k === active || undefined}
                                    onClick={() => setIdx(k)}
                                    style={{ width: k === active ? 22 : 6, height: 6, borderRadius: 3, border: 0, padding: 0, background: k === active ? '#FFFFFF' : 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'width .3s' }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

function Step({ n, done, title, hint, last = false, children }: { n: number; done: boolean; title: string; hint?: string; last?: boolean; children: ReactNode }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '40px minmax(0,1fr)', columnGap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: MW_FONT_EN,
                        fontSize: 14,
                        fontWeight: 600,
                        background: done ? MW_GRADIENT : '#FFFFFF',
                        color: done ? MW.navy : MW.mintDeep,
                        border: `1.5px solid ${done ? MW.mint : '#B8C4C1'}`,
                        transition: 'all .2s',
                    }}
                >
                    {done ? '✓' : pad(n)}
                </span>
                {!last && <span style={{ flex: 1, width: 2, margin: '8px 0', background: done ? 'linear-gradient(180deg,#27AB8F,#3FC2A4)' : '#DDE2DF', transition: 'background .2s' }} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: `4px 0 ${last ? 0 : 52}px`, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, lineHeight: 1.3 }}>{title}</h2>
                    {hint && <span style={{ fontSize: 13, color: MW.mute }}>{hint}</span>}
                </div>
                {children}
            </div>
        </div>
    );
}

function Check({ on, size }: { on: boolean; size: number }) {
    return (
        <span
            aria-hidden="true"
            style={{ flexShrink: 0, width: size, height: size, borderRadius: '50%', boxSizing: 'border-box', border: `1.5px solid ${on ? MW.mint : '#B8C4C1'}`, background: on ? MW.mint : 'transparent', color: MW.navy, fontSize: 11, lineHeight: `${size - 3}px`, textAlign: 'center' }}
        >
            {on ? '✓' : ''}
        </span>
    );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
    return (
        <button
            type="button"
            aria-pressed={on}
            onClick={onClick}
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 20px 0 16px', borderRadius: 999, border: `1.5px solid ${on ? MW.mint : MW.line2}`, background: on ? MW.mintTint : '#FFFFFF', color: MW.navy, fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit' }}
        >
            <Check on={on} size={18} />
            {children}
        </button>
    );
}

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    const btn = (primary: boolean): CSSProperties => ({ width: 44, height: 44, border: 0, borderRadius: '50%', background: primary ? MW.mint : '#F1F4F3', fontSize: 18, color: MW.navy, cursor: 'pointer' });
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, height: 64, boxSizing: 'border-box', border: `1.5px solid ${MW.line2}`, borderRadius: 14, padding: '0 10px 0 20px', background: '#fff' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: MW.mute }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button type="button" onClick={() => onChange(value - 1)} aria-label={`${label}を減らす`} style={btn(false)}>−</button>
                <span aria-live="polite" style={{ minWidth: 44, textAlign: 'center', fontSize: 18, fontWeight: 900 }}>
                    {value}<span style={{ fontSize: 13, fontWeight: 700 }}> 名</span>
                </span>
                <button type="button" onClick={() => onChange(value + 1)} aria-label={`${label}を増やす`} style={btn(true)}>+</button>
            </div>
        </div>
    );
}

function DateField({ label, value, active, onClick }: { label: string; value: string; active: boolean; onClick: () => void }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: MW.mute }}>{label}</span>
            <button
                type="button"
                onClick={onClick}
                aria-label={label}
                aria-expanded={active}
                style={{ ...field, border: `1.5px solid ${active ? MW.mint : MW.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
            >
                <span style={{ color: value ? MW.navy : MW.mute2, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{jpDate(value) || '年 / 月 / 日を選択'}</span>
                <span aria-hidden="true" style={{ flexShrink: 0, fontSize: 12, lineHeight: 1, color: MW.mintDeep }}>▼</span>
            </button>
        </div>
    );
}

function Calendar({ kind, start, end, onPick, onClear, onClose }: { kind: CalKind; start: string; end: string; onPick: (v: string) => void; onClear: () => void; onClose: () => void }) {
    const today = new Date();
    const todayKey = toKey(today);
    const seed = (kind === 'start' ? start : end || start) || todayKey;
    const [ym, setYm] = useState(() => ({ y: +seed.slice(0, 4), m: +seed.slice(5, 7) - 1 }));

    // Re-anchor the month when switching between 出発日 / 帰国日.
    useEffect(() => {
        const v = (kind === 'start' ? start : end || start) || toKey(new Date());
        setYm({ y: +v.slice(0, 4), m: +v.slice(5, 7) - 1 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kind]);

    const { y, m } = ym;
    const first = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    const min = kind === 'end' && start ? start : todayKey;
    const prevDisabled = y < today.getFullYear() || (y === today.getFullYear() && m <= today.getMonth());
    const move = (d: number) => {
        const nd = new Date(y, m + d, 1);
        setYm({ y: nd.getFullYear(), m: nd.getMonth() });
    };
    const navBtn: CSSProperties = { width: 44, height: 44, border: 0, borderRadius: '50%', background: '#F1F4F3', fontSize: 16, color: MW.navy, cursor: 'pointer' };

    return (
        <div style={{ gridColumn: '1/-1', background: '#fff', border: `1.5px solid ${MW.line2}`, borderRadius: 18, padding: 20, boxShadow: '0 12px 32px rgba(10,31,46,0.1)', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 420, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <button type="button" onClick={() => !prevDisabled && move(-1)} disabled={prevDisabled} aria-label="前の月" style={{ ...navBtn, opacity: prevDisabled ? 0.35 : 1, cursor: prevDisabled ? 'default' : 'pointer' }}>←</button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: MW.mintDeep }}>{kind === 'start' ? '出発日' : '帰国日'}を選択</span>
                    <span style={{ fontSize: 17, fontWeight: 900 }}>{y}年{m + 1}月</span>
                </div>
                <button type="button" onClick={() => move(1)} aria-label="次の月" style={navBtn}>→</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 4, textAlign: 'center' }}>
                {WEEK.split('').map((w, i) => (
                    <span key={w} style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? MW.red : i === 6 ? '#2B63C6' : MW.mute, padding: '4px 0' }}>{w}</span>
                ))}
                {Array.from({ length: first }, (_, i) => <span key={`b${i}`} />)}
                {Array.from({ length: dim }, (_, i) => {
                    const d = i + 1;
                    const v = `${y}-${pad(m + 1)}-${pad(d)}`;
                    const off = v < min;
                    const sel = v === start || v === end;
                    const inRange = !!start && !!end && v > start && v < end;
                    const dow = (first + i) % 7;
                    return (
                        <button
                            key={v}
                            type="button"
                            disabled={off}
                            aria-pressed={sel}
                            aria-label={jpDate(v)}
                            onClick={() => onPick(v)}
                            style={{
                                height: 44,
                                border: 0,
                                borderRadius: 12,
                                background: sel ? MW.mint : inRange ? MW.mintTint : 'transparent',
                                color: sel ? MW.navy : off ? '#C3CCCA' : dow === 0 ? MW.red : dow === 6 ? '#2B63C6' : MW.navy,
                                fontSize: 14,
                                fontWeight: sel ? 900 : 500,
                                cursor: off ? 'default' : 'pointer',
                                fontFamily: 'inherit',
                            }}
                        >
                            {d}
                        </button>
                    );
                })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <button type="button" onClick={onClear} style={{ border: 0, background: 'transparent', color: MW.mute, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '10px 0', fontFamily: 'inherit' }}>クリア</button>
                <button type="button" onClick={onClose} style={{ height: 40, padding: '0 18px', border: 0, borderRadius: 999, background: MW.navy, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>閉じる</button>
            </div>
        </div>
    );
}

function Labeled({ label, required = false, children }: { label: string; required?: boolean; children: ReactNode }) {
    return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: MW.mute }}>
                {label} {required && <span style={{ color: MW.red }}>*</span>}
            </span>
            {children}
        </label>
    );
}

function TravelPass(props: {
    passenger: string;
    people: string;
    depart: string;
    budget: string;
    places: string;
    styles: string;
    progress: number;
    canSubmit: boolean;
    submitting: boolean;
    onSubmit: () => void;
}) {
    const { canSubmit, submitting } = props;
    const enabled = canSubmit && !submitting;
    const anim = '3.2s cubic-bezier(.45,.05,.35,1) infinite';
    return (
        <aside aria-label="お見積もり内容" style={{ flex: '0 1 360px', minWidth: 300, position: 'sticky', top: MW_STICKY_TOP + 24, display: 'flex', flexDirection: 'column', filter: 'drop-shadow(0 16px 36px rgba(10,31,46,0.12))' }}>
            <div style={{ background: '#fff', borderRadius: '22px 22px 0 0', padding: '24px 26px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontFamily: MW_FONT_EN, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    <span style={{ color: MW.mute2 }}>TRAVEL PASS · NO.{new Date().getFullYear()}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: MW.mintDeep }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: MW.mint, boxShadow: '0 0 0 4px rgba(39,171,143,0.18)' }} />
                        NOW BOARDING
                    </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) auto', alignItems: 'center', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontFamily: MW_FONT_EN, fontSize: 34, fontWeight: 600, lineHeight: 1.1 }}>NRT</span>
                        <span style={{ fontSize: 12, color: MW.mute }}>東京（成田）</span>
                    </div>
                    <div aria-hidden="true" style={{ position: 'relative', height: 28, color: MW.mintDeep }}>
                        <span style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '2px dashed #D0D6D3' }} />
                        <span className="mw-trail" style={{ position: 'absolute', left: 0, top: '50%', marginTop: -1, height: 2, background: MW.mint, animation: `mwTrail ${anim}` }} />
                        <span className="mw-plane" style={{ position: 'absolute', top: '50%', fontSize: 24, lineHeight: 1, transform: 'translate(-50%,-52%)', background: '#fff', padding: '0 4px', animation: `mwPlane ${anim}` }}>✈</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontFamily: MW_FONT_EN, fontSize: 34, fontWeight: 600, lineHeight: 1.1 }}>UBN</span>
                        <span style={{ fontSize: 12, color: MW.mute }}>ウランバートル</span>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '16px 20px' }}>
                    <PassField label="PASSENGER" value={props.passenger} />
                    <PassField label="PEOPLE" value={props.people} />
                    <PassField label="DEPART" value={props.depart} />
                    <PassField label="BUDGET" value={props.budget} />
                </div>
            </div>
            <div style={{ position: 'relative', height: 20, background: '#fff' }}>
                <span style={{ position: 'absolute', left: -10, top: 0, width: 20, height: 20, borderRadius: '50%', background: '#FFFFFF' }} />
                <span style={{ position: 'absolute', right: -10, top: 0, width: 20, height: 20, borderRadius: '50%', background: '#FFFFFF' }} />
                <span style={{ position: 'absolute', left: 18, right: 18, top: 9, borderTop: '2px dashed #DDE2DF' }} />
            </div>
            <div style={{ background: '#fff', borderRadius: '0 0 22px 22px', padding: '18px 26px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <PassField label="DESTINATION" value={props.places} />
                <PassField label="STYLE" value={props.styles} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: MW.mute }}>
                        <span>入力状況</span>
                        <span style={{ color: MW.mintDeep }}>{props.progress} / 9</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: MW.line3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round((props.progress / 9) * 100)}%`, background: 'linear-gradient(90deg,#27AB8F,#3FC2A4)', borderRadius: 3, transition: 'width .3s' }} />
                    </div>
                </div>
                <button
                    type="button"
                    onClick={props.onSubmit}
                    disabled={!enabled}
                    style={{ height: 56, border: 0, borderRadius: 14, fontSize: 16, fontWeight: 700, background: enabled ? MW_GRADIENT : '#EEF0EC', color: enabled ? MW.navy : MW.mute2, cursor: enabled ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
                >
                    {submitting ? '送信中…' : '見積もりを依頼する'}
                </button>
                {!canSubmit && <span style={{ fontSize: 12, color: MW.mute, textAlign: 'center', marginTop: -6 }}>行き先・お名前・メールアドレスをご入力ください</span>}
                <span style={{ fontSize: 12, lineHeight: 1.7, color: MW.mute, textAlign: 'center' }}>無料・拘束なし ｜ 24時間以内に日本語スタッフがご返信</span>
            </div>
        </aside>
    );
}

function PassField({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontFamily: MW_FONT_EN, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: MW.mute2 }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{value}</span>
        </div>
    );
}

function DoneModal({ places, period, people, categories, onClose, onStatus, go }: {
    places: string;
    period: string;
    people: string;
    categories: { id: string; name: string }[];
    onClose: () => void;
    onStatus: () => void;
    go: (path: string) => void;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const row: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderTop: `1px solid ${MW.line3}`, fontSize: 14 };
    const cats = [{ id: '', name: 'すべて' }, ...categories];

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(10,31,46,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="quote-done-title"
                style={{ position: 'relative', width: '100%', maxWidth: 440, maxHeight: 'calc(100vh - 48px)', overflow: 'auto', background: '#fff', borderRadius: 24, padding: '40px 28px 24px', display: 'flex', flexDirection: 'column', gap: 28, boxSizing: 'border-box' }}
            >
                <button type="button" onClick={onClose} aria-label="閉じる" style={{ position: 'absolute', right: 14, top: 14, width: 44, height: 44, border: 0, background: 'transparent', fontSize: 22, color: MW.navy, cursor: 'pointer' }}>×</button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
                    <span style={{ width: 80, height: 80, borderRadius: '50%', background: MW.mintTint, color: MW.mintDeep, fontSize: 30, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                    <h2 id="quote-done-title" style={{ margin: '8px 0 0', fontSize: 26, fontWeight: 900, lineHeight: 1.4 }}>お見積りリクエストを<br />受け付けました</h2>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: MW.mute }}>担当者が確認後、24時間以内に<br />オーダーメイドお見積りをお送りします。</p>
                </div>
                <div style={{ border: `1px solid ${MW.line}`, borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, paddingBottom: 12 }}>リクエスト内容の要約</span>
                    <div style={row}><span style={{ color: MW.mute }}>行き先</span><span style={{ fontWeight: 700, textAlign: 'right' }}>{places}</span></div>
                    <div style={row}><span style={{ color: MW.mute }}>旅行日程</span><span style={{ fontWeight: 700, textAlign: 'right' }}>{period}</span></div>
                    <div style={{ ...row, paddingBottom: 0 }}><span style={{ color: MW.mute }}>旅行人数</span><span style={{ fontWeight: 700, textAlign: 'right' }}>{people}</span></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 17, fontWeight: 700 }}>待っている間に見てみる</span>
                        <a href="/products" onClick={(e) => { e.preventDefault(); go('/products'); }} style={{ fontSize: 13, color: MW.mute, textDecoration: 'none' }}>もっと見る</a>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {cats.map((c) => (
                            <button
                                key={c.id || 'all'}
                                type="button"
                                onClick={() => go(c.id ? `/category/${c.id}` : '/products')}
                                style={{ border: `1px solid ${MW.line2}`, background: '#fff', borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: MW.navy, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button type="button" onClick={onStatus} style={{ height: 56, border: 0, borderRadius: 14, background: MW.mint, color: MW.navy, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        私のお見積り状況を見る
                    </button>
                    <button type="button" onClick={() => go('/')} style={{ height: 48, border: 0, background: 'transparent', color: MW.mute, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                        ホームに戻る
                    </button>
                </div>
            </div>
        </div>
    );
}

const field: CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    height: 56,
    border: `1.5px solid ${MW.line2}`,
    borderRadius: 14,
    padding: '0 18px',
    fontSize: 15,
    color: MW.navy,
    background: '#fff',
    outline: 'none',
    fontFamily: 'inherit',
};
