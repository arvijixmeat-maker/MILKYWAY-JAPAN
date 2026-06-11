import React from 'react';
import mongoliaHero from '../../assets/login_bg_3.jpg';

/**
 * 고객 문서(견적서·일정표·안내) 공용 파츠 — Trip.com식 블루/네이비 디자인.
 * 견적(/estimate/:id)과 예약 확정 일정표(/documents/itinerary/:id)가 같은 렌더러를 쓴다.
 * 고객 노출 카피는 전부 일본어.
 */

export const DOC_BLUE = '#287DFA';
export const DOC_NAVY = '#0B1B45';

export const normalizeImages = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && !!v);
    if (typeof value === 'string') {
        if (value.startsWith('[')) {
            try { const p = JSON.parse(value); return Array.isArray(p) ? p.filter((v): v is string => typeof v === 'string') : []; } catch { return []; }
        }
        return value.startsWith('http') ? [value] : [];
    }
    return [];
};

export const yen = (n?: number | null) => (typeof n === 'number' && !Number.isNaN(n)) ? `¥${n.toLocaleString('ja-JP')}` : '—';

export interface DocDay {
    day: number;
    title?: string;
    region?: string;
    summary?: string;
    activities: { time?: string; type?: string; title: string; description?: string; images?: string[] | string }[];
    meals?: { breakfast?: string; lunch?: string; dinner?: string };
    accommodation?: { name?: string; location?: string; images?: string[] | string; description?: string } | null;
}

// ─── 상단 브랜드 바 ───
export const DocTopBar: React.FC<{ docLabel: string; number: string; date: string }> = ({ docLabel, number, date }) => (
    <div className="flex items-center justify-between px-1 py-3">
        <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[26px]" style={{ color: DOC_BLUE }}>nights_stay</span>
            <div>
                <p className="text-[15px] font-black leading-none" style={{ color: DOC_NAVY }}>モンゴル銀河旅行社</p>
                <p className="text-[9px] font-bold tracking-[0.22em] text-slate-400">MONGOLIA MILKYWAY</p>
            </div>
        </div>
        <div className="text-right text-[11px] font-bold text-slate-500">
            <p>{docLabel}番号: <span className="font-black" style={{ color: DOC_NAVY }}>{number}</span></p>
            <p>発行日: {date}</p>
        </div>
    </div>
);

// ─── 밤하늘 히어로 ───
export const DocHero: React.FC<{ eyebrow: string; title: string; subtitle?: string; chips?: string[] }> = ({ eyebrow, title, subtitle, chips }) => (
    <div className="relative overflow-hidden rounded-3xl">
        <img src={mongoliaHero} alt="" className="h-[230px] w-full object-cover sm:h-[270px]" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(110deg, rgba(11,27,69,0.94) 0%, rgba(22,39,95,0.78) 45%, rgba(40,125,250,0.30) 100%)' }} />
        <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-9 text-white">
            <p className="text-[12px] font-bold tracking-wide text-sky-200">{eyebrow}</p>
            <h1 className="mt-2 max-w-xl text-[28px] font-black leading-tight sm:text-[34px]">{title}</h1>
            {subtitle && <p className="mt-2 max-w-xl text-[12.5px] font-semibold leading-relaxed text-white/85">{subtitle}</p>}
            {chips && chips.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {chips.map((c, i) => <span key={i} className="rounded-xl px-3 py-1.5 text-[12px] font-black text-white" style={{ background: DOC_BLUE }}>{c}</span>)}
                </div>
            )}
        </div>
    </div>
);

// ─── 카드 셸 + 섹션 타이틀 ───
export const DocCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <section className={`print-break rounded-2xl bg-white p-5 sm:p-6 shadow-[0_8px_24px_rgba(11,27,69,0.08)] ${className}`}>{children}</section>
);
export const DocSecTitle: React.FC<{ icon: string; children: React.ReactNode; tone?: 'blue' | 'red' }> = ({ icon, children, tone = 'blue' }) => (
    <h3 className="mb-4 flex items-center gap-2 text-[16px] font-black" style={{ color: tone === 'red' ? '#EF4444' : DOC_NAVY }}>
        <span className="flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ background: tone === 'red' ? '#EF4444' : DOC_BLUE }}>
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </span>
        {children}
    </h3>
);

// ─── 여행 정보 그리드 ───
export const TripInfoGrid: React.FC<{ items: { icon: string; label: string; value: React.ReactNode }[] }> = ({ items }) => (
    <DocCard>
        <DocSecTitle icon="person">ご旅行情報</DocSecTitle>
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full" style={{ background: '#EAF3FF', color: DOC_BLUE }}>
                        <span className="material-symbols-outlined text-[22px]">{it.icon}</span>
                    </span>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-400">{it.label}</p>
                        <p className="truncate text-[14.5px] font-black" style={{ color: DOC_NAVY }}>{it.value}</p>
                    </div>
                </div>
            ))}
        </div>
    </DocCard>
);

// ─── 결제 정보 ───
export const PaymentSummary: React.FC<{ total: number; deposit: number; methodNote?: string }> = ({ total, deposit, methodNote }) => {
    const balance = Math.max(0, total - deposit);
    const rows: Array<[React.ReactNode, React.ReactNode]> = [
        ['総旅行代金', <b key="t" style={{ color: DOC_BLUE }}>{yen(total)}</b>],
        [<span key="dl">ご予約金 <small className="font-semibold text-slate-400">（ご予約確定時にお支払い）</small></span>, <b key="d" style={{ color: DOC_BLUE }}>{yen(deposit)}</b>],
        [<span key="bl">現地お支払い残金 <small className="font-semibold text-slate-400">（ご到着後に現地でお支払い）</small></span>, <b key="b" style={{ color: DOC_BLUE }}>{yen(balance)}</b>],
        ['お支払い方法', <span key="m" className="text-right text-[12px] font-bold text-slate-600">{methodNote || '銀行振込 / PayPal（残金は現地払い）'}</span>],
    ];
    return (
        <DocCard>
            <DocSecTitle icon="payments">お支払い情報</DocSecTitle>
            <div className="grid gap-4 sm:grid-cols-[300px_1fr]">
                <div className="relative overflow-hidden rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #2F86FF 0%, #1656D6 100%)' }}>
                    <span className="material-symbols-outlined absolute right-4 top-4 text-[34px] opacity-40">account_balance_wallet</span>
                    <p className="text-[12px] font-bold text-white/85">総旅行代金</p>
                    <p className="mt-2 text-[32px] font-black tracking-tight">{yen(total)}</p>
                    <p className="mt-1 text-[10.5px] font-bold text-white/70">（日本円・税込）</p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                    {rows.map(([l, v], i) => (
                        <div key={i} className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-[13px] font-bold last:border-b-0" style={{ color: DOC_NAVY }}>
                            <span>{l}</span>{v}
                        </div>
                    ))}
                </div>
            </div>
        </DocCard>
    );
};

// ─── 포함 / 불포함 ───
export const IncludeExclude: React.FC<{ included: string[]; excluded: string[] }> = ({ included, excluded }) => (
    <div className="grid gap-4 sm:grid-cols-2">
        <DocCard className="!shadow-[0_8px_24px_rgba(40,125,250,0.10)]">
            <DocSecTitle icon="check">含まれるもの</DocSecTitle>
            <ul className="space-y-2.5">
                {included.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] font-bold" style={{ color: DOC_NAVY }}>
                        <span className="material-symbols-outlined mt-px text-[18px]" style={{ color: DOC_BLUE, fontVariationSettings: "'FILL' 1" }}>check_circle</span>{t}
                    </li>
                ))}
                {included.length === 0 && <li className="text-[12px] font-semibold text-slate-400">—</li>}
            </ul>
        </DocCard>
        <DocCard className="!shadow-[0_8px_24px_rgba(239,68,68,0.08)]">
            <DocSecTitle icon="close" tone="red">含まれないもの</DocSecTitle>
            <ul className="space-y-2.5">
                {excluded.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] font-bold text-slate-600">
                        <span className="material-symbols-outlined mt-px text-[18px] text-red-400" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>{t}
                    </li>
                ))}
                {excluded.length === 0 && <li className="text-[12px] font-semibold text-slate-400">—</li>}
            </ul>
        </DocCard>
    </div>
);

// ─── 예약 흐름 3단계 ───
export const BookingSteps: React.FC = () => {
    const steps = [
        { icon: 'edit_calendar', t: 'ご予約お申込み' },
        { icon: 'credit_card', t: 'ご予約金のお振込', s: '（ご予約確定）' },
        { icon: 'account_balance_wallet', t: '現地で残金お支払い', s: '（モンゴル到着後）' },
    ];
    return (
        <DocCard>
            <DocSecTitle icon="description">ご予約の流れ</DocSecTitle>
            <div className="grid gap-3 sm:grid-cols-[1.2fr_auto_1.2fr_auto_1.2fr] sm:items-center">
                {steps.map((st, i) => (
                    <React.Fragment key={st.t}>
                        {i > 0 && <span className="material-symbols-outlined hidden text-slate-300 sm:block">chevron_right</span>}
                        <div className="rounded-2xl bg-[#F4F8FF] px-3 py-4 text-center">
                            <span className="material-symbols-outlined text-[30px]" style={{ color: DOC_BLUE }}>{st.icon}</span>
                            <p className="mt-1 text-[12.5px] font-black" style={{ color: DOC_NAVY }}>{st.t}</p>
                            {st.s && <p className="text-[10.5px] font-bold text-slate-400">{st.s}</p>}
                        </div>
                    </React.Fragment>
                ))}
            </div>
            <p className="mt-4 text-[11.5px] font-bold leading-relaxed text-slate-500">
                ご予約は、ご予約金のご入金確認後に確定いたします。残金はモンゴル到着後、現地にてお支払いください。
            </p>
        </DocCard>
    );
};

// ─── DAY 카드 (상세 일정표) ───
const MEAL_DEFS: Array<{ key: 'breakfast' | 'lunch' | 'dinner'; label: string; icon: string; color: string }> = [
    { key: 'breakfast', label: '朝食', icon: 'egg_alt', color: '#F59E0B' },
    { key: 'lunch', label: '昼食', icon: 'ramen_dining', color: '#10B981' },
    { key: 'dinner', label: '夕食', icon: 'restaurant', color: '#F97316' },
];

export const DayCard: React.FC<{ day: DocDay }> = ({ day }) => {
    const photo = day.activities.map(a => normalizeImages(a.images)[0]).find(Boolean);
    const accImgs = normalizeImages(day.accommodation?.images);
    const meals = day.meals || {};
    return (
        <DocCard className="!p-0 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-5 pt-5 sm:px-6">
                <span className="rounded-full px-4 py-1.5 text-[13px] font-black text-white" style={{ background: DOC_BLUE }}>DAY {day.day}</span>
                <h4 className="min-w-0 flex-1 truncate text-[16px] font-black" style={{ color: DOC_NAVY }}>{day.title || `${day.day}日目`}</h4>
                {day.region && (
                    <span className="inline-flex items-center gap-1 text-[12px] font-black" style={{ color: DOC_BLUE }}>
                        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>{day.region}
                    </span>
                )}
            </div>
            {day.summary && <p className="px-5 pt-2 text-[12px] font-semibold leading-relaxed text-slate-500 sm:px-6">{day.summary}</p>}

            <div className={`grid gap-4 px-5 py-4 sm:px-6 ${photo ? 'lg:grid-cols-[300px_1fr_150px]' : 'lg:grid-cols-[1fr_150px]'}`}>
                {photo && <img src={photo} alt={day.title || ''} loading="lazy" className="h-[180px] w-full rounded-xl object-cover lg:h-full lg:max-h-[230px]" />}
                <div>
                    <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-black" style={{ color: DOC_BLUE }}>
                        <span className="material-symbols-outlined text-[17px]">event_note</span>日程
                    </p>
                    <ul className="space-y-2">
                        {day.activities.map((a, i) => (
                            <li key={i} className="flex items-start gap-2 text-[12.5px] font-bold" style={{ color: DOC_NAVY }}>
                                <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full" style={{ background: DOC_BLUE }} />
                                <span>{a.time ? `${a.time}　` : ''}{a.title}</span>
                            </li>
                        ))}
                        {day.activities.length === 0 && <li className="text-[12px] font-semibold text-slate-400">調整中</li>}
                    </ul>
                </div>
                <div className="flex gap-2 lg:flex-col lg:justify-start lg:border-l lg:border-slate-100 lg:pl-4">
                    {MEAL_DEFS.map(m => (
                        <div key={m.key} className="flex flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 lg:flex-none">
                            <span className="material-symbols-outlined text-[20px]" style={{ color: m.color }}>{m.icon}</span>
                            <div className="leading-tight">
                                <p className="text-[10px] font-black" style={{ color: m.color }}>{m.label}</p>
                                <p className="text-[11.5px] font-bold text-slate-600">{(meals as any)[m.key] || '—'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {day.accommodation?.name && (
                <div className="flex items-center gap-3 border-t border-slate-100 bg-[#F4F8FF] px-5 py-3.5 sm:px-6">
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-white" style={{ background: DOC_BLUE }}>
                        <span className="material-symbols-outlined text-[20px]">apartment</span>
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10.5px] font-black" style={{ color: DOC_BLUE }}>宿泊情報</p>
                        <p className="truncate text-[13.5px] font-black" style={{ color: DOC_NAVY }}>
                            {day.accommodation.name}
                            {day.accommodation.location && <span className="ml-2 text-[11px] font-bold text-slate-400">（{day.accommodation.location}）</span>}
                        </p>
                        {day.accommodation.description && <p className="truncate text-[11px] font-semibold text-slate-500">{day.accommodation.description}</p>}
                    </div>
                    {accImgs[0] && <img src={accImgs[0]} alt={day.accommodation.name} loading="lazy" className="h-14 w-24 flex-none rounded-lg object-cover" />}
                </div>
            )}
        </DocCard>
    );
};

// ─── 안내 & 팁 (공통 안내 페이지) ───
export const GuideTips: React.FC<{
    notices: { title: string; body: string }[];
    emergencyPhone?: string;
    emergencyEmail?: string;
    closingMessage?: string;
}> = ({ notices, emergencyPhone, emergencyEmail, closingMessage }) => {
    const dos = ['遊牧民のご家庭では挨拶を大切に', '自然を守り、ゴミは持ち帰りましょう', '撮影の前にひと言ご確認ください', 'ガイド・現地の方への敬意とマナーを'];
    const donts = ['草原や自然にゴミを捨てない', '家畜や野生動物を驚かせない', '許可のないドローン撮影は禁止', '文化遺跡・宗教施設で騒がない'];
    return (
        <>
            <DocCard>
                <DocSecTitle icon="info">ご案内・ご注意事項</DocSecTitle>
                <div className="grid gap-3 sm:grid-cols-2">
                    {notices.map((n, i) => (
                        <div key={i} className="flex gap-2.5 rounded-xl bg-slate-50 p-3.5">
                            <span className="material-symbols-outlined mt-px text-[19px]" style={{ color: DOC_BLUE }}>info</span>
                            <div>
                                <p className="text-[12.5px] font-black" style={{ color: DOC_NAVY }}>{n.title}</p>
                                <p className="mt-1 whitespace-pre-wrap text-[11.5px] font-semibold leading-relaxed text-slate-500">{n.body}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </DocCard>

            <DocCard>
                <DocSecTitle icon="handshake">現地でのマナー</DocSecTitle>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                        <p className="mb-2.5 flex items-center gap-1.5 text-[13px] font-black text-emerald-600"><span className="material-symbols-outlined text-[18px]">thumb_up</span>お願いしたいこと</p>
                        <ul className="space-y-2">{dos.map((t, i) => <li key={i} className="flex items-start gap-2 text-[12px] font-bold text-emerald-800"><span className="material-symbols-outlined mt-px text-[16px] text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>{t}</li>)}</ul>
                    </div>
                    <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
                        <p className="mb-2.5 flex items-center gap-1.5 text-[13px] font-black text-red-500"><span className="material-symbols-outlined text-[18px]">block</span>ご遠慮いただきたいこと</p>
                        <ul className="space-y-2">{donts.map((t, i) => <li key={i} className="flex items-start gap-2 text-[12px] font-bold text-red-700"><span className="material-symbols-outlined mt-px text-[16px] text-red-400" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>{t}</li>)}</ul>
                    </div>
                </div>
            </DocCard>

            <DocCard>
                <DocSecTitle icon="call">緊急連絡先</DocSecTitle>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { icon: 'support_agent', t: '弊社（現地・日本語）', v: emergencyPhone || '+976-80-1234-5678', s: '24時間対応' },
                        { icon: 'mail', t: 'メール', v: emergencyEmail || 'info@mongolryokou.com', s: '随時受付' },
                        { icon: 'emergency', t: '救急', v: '103', s: '（現地）' },
                        { icon: 'local_police', t: '警察', v: '102', s: '（現地）' },
                    ].map((c, i) => (
                        <div key={i} className="rounded-2xl border border-slate-100 p-3.5 text-center">
                            <span className="material-symbols-outlined text-[26px]" style={{ color: DOC_BLUE }}>{c.icon}</span>
                            <p className="mt-1 text-[10.5px] font-black text-slate-400">{c.t}</p>
                            <p className="break-all text-[12.5px] font-black" style={{ color: DOC_NAVY }}>{c.v}</p>
                            <p className="text-[10px] font-bold text-slate-400">{c.s}</p>
                        </div>
                    ))}
                </div>
            </DocCard>

            {closingMessage && (
                <div className="relative overflow-hidden rounded-2xl">
                    <img src={mongoliaHero} alt="" className="h-[110px] w-full object-cover" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(11,27,69,0.92) 0%, rgba(40,125,250,0.45) 100%)' }} />
                    <p className="absolute inset-0 flex items-center px-6 text-[15px] font-black text-white">{closingMessage}</p>
                </div>
            )}
        </>
    );
};

// ─── 푸터 (브랜드 + 신뢰 배지) ───
export const DocFooter: React.FC = () => (
    <div className="rounded-2xl bg-white px-5 py-5 shadow-[0_8px_24px_rgba(11,27,69,0.08)] sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ background: DOC_NAVY }}>
                    <span className="material-symbols-outlined text-[24px]">nights_stay</span>
                </span>
                <div>
                    <p className="text-[15px] font-black" style={{ color: DOC_NAVY }}>モンゴル銀河旅行社</p>
                    <p className="text-[10px] font-bold tracking-[0.18em] text-slate-400">MONGOLIA MILKYWAY ｜ PRIVATE TOUR SPECIALIST</p>
                </div>
            </div>
            <div className="flex gap-4">
                {[
                    { icon: 'verified_user', t: '安心の旅', s: '現地専門ガイド同行' },
                    { icon: 'diamond', t: 'オーダーメイド', s: 'お客様だけの1:1プラン' },
                    { icon: 'favorite', t: '最高の体験', s: '忘れられない思い出を' },
                ].map((b, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[20px]" style={{ color: DOC_BLUE }}>{b.icon}</span>
                        <div className="leading-tight">
                            <p className="text-[11px] font-black" style={{ color: DOC_NAVY }}>{b.t}</p>
                            <p className="text-[9.5px] font-bold text-slate-400">{b.s}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        <p className="mt-4 border-t border-slate-100 pt-3 text-[10.5px] font-bold text-slate-400">
            ※ 本日程は現地事情（天候・交通状況など）により変更となる場合がございます。
        </p>
    </div>
);
