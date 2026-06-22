import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { SEO } from '../components/seo/SEO';
import { normalizeImages } from '../components/document/TripDocParts';
import { COMPANY_INFO, EMBASSY_INFO, LOCAL_EMERGENCY } from '../constants/company';

/**
 * 確定日程表（고객용）— "確定日程表.dc.html" 디자인 적용.
 * 클린 서류형 레이아웃: 표지 + 旅行情報 + 含まれるもの + DAY 일정 + 海外安全情報 + 健康/契約 안내 + 同意確認.
 * 동적 데이터(고객명·기간·인원·포함/불포함·DAY)는 API에서, 안전/긴급/회사 정보는 회사 상수에서 가져온다.
 * 견적 페이지(/estimate/:id)가 쓰는 TripDocParts 렌더러와는 독립(공용 컴포넌트 미수정).
 */

// ─── 디자인 토큰 (確定日程表.dc.html과 일치) ───
const INK = '#1A1B1E';
const SUB = '#5F636B';
const MUTE = '#8A8F99';
const FAINT = '#B4B8C0';
const BLUE = '#1A8CFF';
const BLUE_DK = '#0B6FE0';
const BLUE_BG = '#E8F2FF';
const BLUE_TX = '#24405E';
const GREEN = '#18A957';
const GREEN_BG = '#E4F7EC';
const RED = '#FF4F4F';
const RED_BG = '#FFECEC';
const WARN_BG = '#FFF6F0';
const WARN_TITLE = '#B5451B';
const WARN_SUB = '#C0693A';
const WARN_BULLET = '#E0701F';
const BODY = '#4A4E55';
const BORDER = '#E6E8EC';
const HAIRLINE = '#F1F2F4';
const SECTION = '#F7F8FA';
const PAGE_BG = '#e7e5df';

interface Activity {
    time?: string;
    type?: string;
    title: string;
    description?: string;
    images?: string[] | string;
}

interface DayData {
    day: number;
    title: string;
    region?: string;
    summary?: string;
    activities: Activity[];
    meals?: { breakfast?: string; lunch?: string; dinner?: string };
    accommodation: {
        id?: string;
        name: string;
        type?: string;
        location?: string;
        images?: string[] | string;
        description?: string;
        facilities?: string[] | string;
    } | null;
}

interface DocumentSettings {
    overview?: {
        subtitle?: string;
        heroTagline?: string;
        intro?: string;
        includedText?: string;
        excludedText?: string;
    };
    detail?: { title?: string; note?: string };
    guide?: {
        notices?: { title: string; body: string }[];
        guidePhone?: string;
        emergencyPhone?: string;
        emergencyEmail?: string;
        closingMessage?: string;
    };
}

interface ItineraryData {
    reservation: {
        id: string;
        reservationNumber: string | null;
        productName: string;
        customerName: string;
        travelers: number;
        startDate: string;
        endDate: string;
        status: string;
    };
    template: { id: string; name: string; description: string; days: any[]; documentSettings?: DocumentSettings } | null;
    guide: { id?: string; name: string; image?: string; phone?: string; languages?: string[] | string } | null;
    days: DayData[];
    productIncluded?: string[];
    productExcluded?: string[];
}

const formatRange = (start?: string, end?: string) => {
    const f = (iso?: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso || '';
        const wd = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
        return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}(${wd})`;
    };
    const s = f(start);
    const e = f(end);
    if (!s && !e) return '—';
    return `${s}〜${e}`;
};

const dayDate = (start: string | undefined, dayNum: number) => {
    if (!start) return '';
    const d = new Date(start);
    if (Number.isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + dayNum - 1);
    const wd = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
    return `${d.getMonth() + 1}.${d.getDate()} ${wd}`;
};

const computeDuration = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
    const nights = Math.round((e.getTime() - s.getTime()) / 86400000);
    return nights >= 0 ? { nights, days: nights + 1 } : null;
};

const splitItems = (t?: string) => (t || '').split(/\r?\n|、|,/).map(x => x.trim()).filter(Boolean);

// "全日程の宿泊：4〜5つ星ホテル…" → { title, desc }. 구분자 없으면 title만.
const splitTitleDesc = (s: string): { title: string; desc: string } => {
    const idx = s.search(/[：:｜]/);
    if (idx > 0) return { title: s.slice(0, idx).trim(), desc: s.slice(idx + 1).trim() };
    return { title: s.trim(), desc: '' };
};

const asArray = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && !!x.trim());
    if (typeof v === 'string') {
        if (v.startsWith('[')) { try { const p = JSON.parse(v); return Array.isArray(p) ? p.filter((x: any) => typeof x === 'string' && x.trim()) : []; } catch { /* noop */ } }
        return v.split(/\r?\n|、|,/).map(x => x.trim()).filter(Boolean);
    }
    return [];
};

// ─── 소형 UI 헬퍼 ───
const sectionDivider: React.CSSProperties = { borderTop: `8px solid ${SECTION}` };
const eyebrow: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.16em' };

const Bullet: React.FC<{ n?: React.ReactNode; color?: string; children: React.ReactNode }> = ({ n = '・', color = BLUE, children }) => (
    <div style={{ display: 'flex', gap: 9, fontSize: 12.5, color: BODY, lineHeight: 1.6 }}>
        <span style={{ color, fontWeight: 700, flex: 'none' }}>{n}</span>
        <span style={{ flex: 1 }}>{children}</span>
    </div>
);

const InfoRow: React.FC<{ label: string; value: React.ReactNode; last?: boolean }> = ({ label, value, last }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: last ? 'none' : `1px solid ${HAIRLINE}`, gap: 16 }}>
        <span style={{ fontSize: 13, color: MUTE, flex: 'none' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: INK, textAlign: 'right' }}>{value}</span>
    </div>
);

const IncludeItem: React.FC<{ ok: boolean; text: string }> = ({ ok, text }) => {
    const { title, desc } = splitTitleDesc(text);
    return (
        <div style={{ display: 'flex', gap: 9 }}>
            <span style={{ width: 20, height: 20, flex: 'none', borderRadius: '50%', background: ok ? GREEN_BG : RED_BG, color: ok ? GREEN : RED, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: ok ? 12 : 11, fontWeight: 800 }}>{ok ? '✓' : '✕'}</span>
            <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{title}</div>
                {desc && <div style={{ fontSize: 12, color: SUB, lineHeight: 1.65, marginTop: 2 }}>{desc}</div>}
            </div>
        </div>
    );
};

export const DocumentItinerary: React.FC = () => {
    const { reservationId } = useParams();
    const [data, setData] = useState<ItineraryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!reservationId) return;
        (async () => {
            try {
                const res = await api.documents.itinerary.get(reservationId);
                setData(res);
            } catch (e: any) {
                setError(e.message || '日程表を読み込めませんでした。');
            } finally {
                setLoading(false);
            }
        })();
    }, [reservationId]);

    // Noto Sans JP 폰트 — 디자인 충실도 (페이지 한정 주입)
    useEffect(() => {
        const id = 'doc-noto-sans-jp';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;800;900&display=swap';
        document.head.appendChild(link);
    }, []);

    if (loading) {
        return (
            <>
                <SEO title="確定日程表" description="お客様専用の旅行日程表です。" robots="noindex, nofollow" />
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: PAGE_BG }}>
                    <div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: '#d6d3cb', borderTopColor: BLUE }} />
                </div>
            </>
        );
    }

    if (error || !data) {
        return (
            <>
                <SEO title="確定日程表" description="お客様専用の旅行日程表です。" robots="noindex, nofollow" />
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: PAGE_BG }}>
                    <div style={{ maxWidth: 360, background: '#fff', borderRadius: 4, padding: 28, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
                        <div style={{ fontSize: 40 }}>🗓</div>
                        <p style={{ marginTop: 10, fontSize: 17, fontWeight: 800, color: INK }}>日程表を表示できません</p>
                        <p style={{ marginTop: 4, fontSize: 13, color: SUB }}>{error || 'URLをご確認ください。'}</p>
                    </div>
                </div>
            </>
        );
    }

    const { reservation, template, guide, days } = data;
    const settings = template?.documentSettings || {};
    const overview = settings.overview || {};
    const detail = settings.detail || {};
    const guideSettings = settings.guide || {};
    const duration = computeDuration(reservation.startDate, reservation.endDate);
    const durationChip = duration ? `${duration.nights}泊${duration.days}日` : `全${days.length}日間`;

    const includedFromText = splitItems(overview.includedText);
    const excludedFromText = splitItems(overview.excludedText);
    const productInc = data.productIncluded || [];
    const productExc = data.productExcluded || [];
    const includedDisplay = productInc.length ? productInc
        : includedFromText.length ? includedFromText
        : ['空港送迎・専用車', '全日程の宿泊（ホテル・ゲル）', '日程表内のお食事', '日本語ガイド同行', '観光入場料・各種体験'];
    const excludedDisplay = productExc.length ? productExc
        : excludedFromText.length ? excludedFromText
        : ['国際線航空券', '海外旅行保険', '個人的な費用（お土産・飲み物など）', 'ガイド・ドライバーへのチップ'];

    const title = template?.name || reservation.productName;
    const subtitle = overview.heroTagline || template?.description || '中央モンゴルの大自然と文化を体験する特別な旅へ。日本語ガイド同行。';
    const officePhone1 = COMPANY_INFO.phoneKR;
    const officePhone2 = guideSettings.emergencyPhone || guide?.phone || COMPANY_INFO.phoneSecondary;
    const telHref = (p: string) => `tel:${p.replace(/[^+\d]/g, '')}`;

    const meals: Array<{ k: 'breakfast' | 'lunch' | 'dinner'; l: string }> = [
        { k: 'breakfast', l: '朝' }, { k: 'lunch', l: '昼' }, { k: 'dinner', l: '夕' },
    ];

    return (
        <>
            <SEO title="確定日程表" description="お客様専用の旅行日程表です。" robots="noindex, nofollow" />

            <style>{`
                @media print {
                    body { background: #fff !important; }
                    .no-print { display: none !important; }
                    .doc-page { background: #fff !important; padding: 0 !important; }
                    .doc-card { box-shadow: none !important; }
                    .print-break { break-inside: avoid; page-break-inside: avoid; }
                }
                @page { margin: 10mm; }
            `}</style>

            <div
                className="doc-page jp"
                style={{
                    minHeight: '100vh', background: PAGE_BG, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '16px 12px 90px', fontFamily: "'Noto Sans JP','Pretendard',sans-serif", boxSizing: 'border-box',
                }}
            >
                <div style={{ width: '100%', maxWidth: 430 }}>
                    <div className="doc-card" style={{ background: '#fff', borderRadius: 4, boxShadow: '0 1px 3px rgba(0,0,0,.08)', overflow: 'hidden' }}>

                        {/* ── 표지 ── */}
                        <div style={{ padding: '28px 22px 22px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: MUTE }}>
                                <span style={{ width: 18, height: 18, borderRadius: 5, background: INK, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11 }}>✦</span>
                                MONGOLIA MILKYWAY
                            </div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 18, padding: '5px 11px', background: BLUE_BG, color: BLUE_DK, borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: BLUE }} />ご予約確定
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: INK, letterSpacing: '-0.02em', lineHeight: 1.3, marginTop: 12 }}>{title}</div>
                            <div style={{ fontSize: 13, color: SUB, lineHeight: 1.6, marginTop: 10 }}>{subtitle}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                <span style={{ padding: '6px 12px', border: `1px solid ${BORDER}`, borderRadius: 999, fontSize: 12, fontWeight: 600, color: '#24262B', whiteSpace: 'nowrap' }}>🗓 {durationChip}</span>
                                <span style={{ padding: '6px 12px', border: `1px solid ${BORDER}`, borderRadius: 999, fontSize: 12, fontWeight: 600, color: '#24262B', whiteSpace: 'nowrap' }}>👤 {reservation.travelers || '-'}名</span>
                            </div>
                        </div>

                        {/* ── ご旅行情報 ── */}
                        <div style={{ padding: '20px 22px', ...sectionDivider }} className="print-break">
                            <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginBottom: 14 }}>ご旅行情報</div>
                            <InfoRow label="お客様名" value={`${reservation.customerName || '—'} 様`} />
                            <InfoRow label="ご旅行期間" value={formatRange(reservation.startDate, reservation.endDate)} />
                            <InfoRow label="ご人数" value={`${reservation.travelers || '-'}名`} />
                            <InfoRow label="ガイド" value={guide?.name || '日本語ガイド'} />
                            <InfoRow label="車両" value="専用車" last />
                        </div>

                        {/* ── 含まれるもの / 含まれないもの ── */}
                        <div style={{ padding: '20px 22px', ...sectionDivider }} className="print-break">
                            <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginBottom: 14 }}>含まれるもの</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                                {includedDisplay.map((t, i) => <IncludeItem key={i} ok text={t} />)}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: INK, margin: '18px 0 14px' }}>含まれないもの</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                                {excludedDisplay.map((t, i) => <IncludeItem key={i} ok={false} text={t} />)}
                            </div>

                            {/* 현지 액티비티 참가 안내 */}
                            <div style={{ marginTop: 16, background: WARN_BG, borderRadius: 14, padding: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ fontSize: 15 }}>⚠️</span><span style={{ fontSize: 13.5, fontWeight: 800, color: WARN_TITLE }}>現地アクティビティ参加に関するご案内</span></div>
                                <div style={{ fontSize: 11.5, color: WARN_SUB, marginTop: 4 }}>乗馬・ラクダ乗り・サンドボード</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                                    <Bullet color={WARN_BULLET}>危険を伴う現地アクティビティへの参加は、お客様ご自身の自由意思によるものとなります。</Bullet>
                                    <Bullet color={WARN_BULLET}>体験中に発生した事故や負傷につきましては、旅行保険の補償対象外となる場合があります。</Bullet>
                                    <Bullet color={WARN_BULLET}>お客様ご自身の過失による事故と判断された場合、旅行会社には責任および帰責事由がなく、損害賠償等の責任も負いかねますので、あらかじめご了承ください。</Bullet>
                                    <Bullet color={WARN_BULLET}>上記内容にご同意いただいたお客様のみ、アクティビティへご参加いただけます。現地参加時には<b style={{ color: '#24262B' }}>免責同意書へのご署名</b>をお願いしております。</Bullet>
                                </div>
                            </div>

                            {/* 해외여행보험 안내 */}
                            <div style={{ marginTop: 12, background: BLUE_BG, borderRadius: 14, padding: 16 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 800, color: BLUE_DK }}>☞ 海外旅行保険には必ずご加入ください</div>
                                <div style={{ fontSize: 12.5, color: BLUE_TX, lineHeight: 1.65, marginTop: 8 }}>万が一の事故や病気、手荷物の紛失などに備え、ご出発前に海外旅行保険へ必ずご加入いただきますようお願いいたします。</div>
                            </div>
                        </div>

                        {/* ── 일정표 헤더 + ガイドとのご対面 ── */}
                        <div style={{ padding: '22px 22px 6px', ...sectionDivider }}>
                            <div style={{ ...eyebrow, color: BLUE }}>TOUR ITINERARY</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: INK, marginTop: 4 }}>{detail.title || 'ご旅行日程表'}</div>
                            <div style={{ marginTop: 14, background: BLUE_BG, borderRadius: 14, padding: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 16 }}>🤝</span><span style={{ fontSize: 14, fontWeight: 800, color: BLUE_DK }}>ガイドとのご対面</span></div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                                    <div style={{ fontSize: 11, color: BLUE_TX, lineHeight: 1.65 }}>モンゴル国際空港に到着後、入国手続きを終えて到着ロビーへお進みください。</div>
                                    <div style={{ fontSize: 11, color: BLUE_TX, lineHeight: 1.65 }}>お客様のお名前が書かれた<b style={{ color: BLUE_DK }}>ボードを持ったガイド</b>がお待ちしております。</div>
                                    <div style={{ fontSize: 11, color: BLUE_TX, lineHeight: 1.65 }}>ガイドとのご対面後、いよいよモンゴルの旅が始まります。</div>
                                </div>
                            </div>
                        </div>

                        {/* ── DAY 카드 ── */}
                        {days.length === 0 ? (
                            <div style={{ padding: '18px 22px 24px', textAlign: 'center' }}>
                                <div style={{ fontSize: 36 }}>🗓</div>
                                <p style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: MUTE }}>日程は現在準備中です。</p>
                            </div>
                        ) : (
                            days.map((day, i) => {
                                const dayNum = day.day || i + 1;
                                const imgs: string[] = [];
                                for (const a of day.activities || []) {
                                    for (const u of normalizeImages(a.images)) { if (!imgs.includes(u)) imgs.push(u); if (imgs.length >= 2) break; }
                                    if (imgs.length >= 2) break;
                                }
                                const accImg = normalizeImages(day.accommodation?.images)[0];
                                const facilities = asArray(day.accommodation?.facilities);
                                const isLast = i === days.length - 1;
                                return (
                                    <div key={dayNum} style={{ padding: isLast ? '14px 22px 24px' : '14px 22px 6px' }} className="print-break">
                                        <div style={{ position: 'relative', paddingLeft: 26 }}>
                                            {!isLast && <div style={{ position: 'absolute', left: 5, top: 6, bottom: -14, width: 2, background: BORDER }} />}
                                            <div style={{ position: 'absolute', left: 0, top: 4, width: 12, height: 12, borderRadius: '50%', background: BLUE, boxShadow: `0 0 0 3px ${BLUE_BG}` }} />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: BLUE }}>DAY {dayNum}</span>
                                                {dayDate(reservation.startDate, dayNum) && <span style={{ fontSize: 11, color: FAINT }}>{dayDate(reservation.startDate, dayNum)}</span>}
                                                {day.region && <span style={{ fontSize: 11, color: FAINT }}>・{day.region}</span>}
                                            </div>
                                            <div style={{ fontSize: 16, fontWeight: 800, color: INK, marginTop: 3 }}>{day.title || `${dayNum}日目`}</div>

                                            {imgs.length > 0 && (
                                                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                                    {imgs.slice(0, 2).map((src, k) => (
                                                        <img key={k} src={src} alt={day.title || ''} loading="lazy" style={{ flex: 1, width: '100%', aspectRatio: '1', borderRadius: 12, objectFit: 'cover' }} />
                                                    ))}
                                                </div>
                                            )}

                                            {day.summary && <div style={{ fontSize: 12.5, color: SUB, lineHeight: 1.55, marginTop: 10 }}>{day.summary}</div>}

                                            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 11 }}>
                                                {day.activities.length === 0 && <div style={{ fontSize: 12.5, color: FAINT }}>調整中</div>}
                                                {day.activities.map((a, k) => (
                                                    <div key={k}>
                                                        <div style={{ display: 'flex', gap: 7, alignItems: 'baseline' }}>
                                                            {a.time && <span style={{ fontSize: 11, fontWeight: 700, color: BLUE, flex: 'none' }}>{a.time}</span>}
                                                            <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>{a.title}</span>
                                                        </div>
                                                        {a.description && <div style={{ fontSize: 12.5, color: SUB, lineHeight: 1.55, marginTop: 2, paddingLeft: a.time ? 34 : 0 }}>{a.description}</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 숙소 */}
                                        {day.accommodation?.name && (
                                            <div style={{ marginLeft: 26, marginTop: 14, padding: 12, background: SECTION, borderRadius: 12 }}>
                                                <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                                                    {accImg
                                                        ? <img src={accImg} alt={day.accommodation.name} loading="lazy" style={{ width: 48, height: 48, borderRadius: 10, flex: 'none', objectFit: 'cover' }} />
                                                        : <div style={{ width: 48, height: 48, borderRadius: 10, flex: 'none', background: 'linear-gradient(150deg,#b9c4d2,#7d8a99)' }} />}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: MUTE }}>🛏 ご宿泊</div>
                                                        <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginTop: 2 }}>
                                                            {day.accommodation.name}
                                                            {day.accommodation.location && <span style={{ fontSize: 11, fontWeight: 600, color: FAINT, marginLeft: 6 }}>（{day.accommodation.location}）</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                {facilities.length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                                                        {facilities.map((f, k) => (
                                                            <span key={k} style={{ fontSize: 11, color: BODY, background: '#fff', border: `1px solid ${BORDER}`, padding: '3px 8px', borderRadius: 999 }}>{f}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 식사 */}
                                        <div style={{ marginLeft: 26, marginTop: 8, display: 'flex', gap: 6 }}>
                                            {meals.map(m => {
                                                const v = (day.meals as any)?.[m.k];
                                                return (
                                                    <span key={m.k} style={{ flex: 1, textAlign: 'center', padding: '6px 0', background: '#fff', border: `1px solid ${v ? BLUE_BG : HAIRLINE}`, borderRadius: 8, fontSize: 11, color: v ? BLUE_DK : FAINT, fontWeight: v ? 600 : 400 }}>
                                                        {m.l} {v || '—'}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        {/* ── 海外安全情報 ── */}
                        <div style={{ padding: '24px 22px 20px', ...sectionDivider }} className="print-break">
                            <div style={{ ...eyebrow, color: RED }}>SAFETY &amp; EMERGENCY</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: INK, marginTop: 4 }}>海外安全情報</div>

                            {/* 긴급 연락처 카드 */}
                            <div style={{ marginTop: 16, background: INK, borderRadius: 16, padding: 18, color: '#fff' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: RED, boxShadow: '0 0 0 4px rgba(255,79,79,.25)' }} /><span style={{ fontSize: 13, fontWeight: 800 }}>緊急時の連絡先</span></div>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', lineHeight: 1.6, marginTop: 10 }}>現地状況は刻々と変化するため、現地総括責任者が常時状況を管理しております。ご出発前に <b style={{ color: '#fff' }}>LINE／カカオトーク</b> の連絡先をご案内いたします。</div>
                                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.12)' }}>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', letterSpacing: '0.06em' }}>現地オフィス（日本語対応可）</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                                        <a href={telHref(officePhone1)} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#fff', fontSize: 16, fontWeight: 800 }}>📞 {officePhone1}</a>
                                        {officePhone2 && officePhone2 !== officePhone1 && (
                                            <a href={telHref(officePhone2)} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#fff', fontSize: 16, fontWeight: 800 }}>📞 {officePhone2}</a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 현지 긴급통보처 */}
                            <div style={{ fontSize: 13, fontWeight: 800, color: INK, margin: '18px 0 10px' }}>現地緊急通報先</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {LOCAL_EMERGENCY.map(e => (
                                    <a key={e.number} href={telHref(e.number)} style={{ textDecoration: 'none', background: RED_BG, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 12, color: BODY }}>{e.label}</span>
                                        <span style={{ fontSize: 20, fontWeight: 800, color: RED }}>{e.number}</span>
                                    </a>
                                ))}
                            </div>

                            {/* 대사관 */}
                            <div style={{ marginTop: 16, padding: 14, background: SECTION, borderRadius: 12 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>{EMBASSY_INFO.nameJa}</div>
                                <div style={{ fontSize: 12, color: SUB, lineHeight: 1.6, marginTop: 6 }}>{EMBASSY_INFO.addressJa}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 12, color: MUTE }}>代表電話</span><a href={telHref(EMBASSY_INFO.phone)} style={{ fontSize: 13, fontWeight: 700, color: BLUE, textDecoration: 'none' }}>{EMBASSY_INFO.phone}</a></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 12, color: MUTE }}>緊急（24時間）</span><a href={telHref(EMBASSY_INFO.emergencyPhone)} style={{ fontSize: 13, fontWeight: 700, color: BLUE, textDecoration: 'none' }}>{EMBASSY_INFO.emergencyPhone}</a></div>
                                </div>
                            </div>

                            {/* 회사 정보 */}
                            <div style={{ marginTop: 12, padding: 14, background: SECTION, borderRadius: 12 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: INK, marginBottom: 8 }}>会社情報</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {[
                                        ['商号', COMPANY_INFO.nameLegal],
                                        ['代表者', COMPANY_INFO.ceo],
                                        ['事業者登録番号', COMPANY_INFO.registrationNumber],
                                        ['観光事業登録番号', COMPANY_INFO.tourRegistrationNumber],
                                        ['所在地', COMPANY_INFO.addressJa],
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <span style={{ fontSize: 12, color: MUTE, flex: 'none' }}>{k}</span>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: '#24262B', textAlign: 'right', lineHeight: 1.5 }}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── 安全に関するご案内 ── */}
                        <div style={{ padding: '20px 22px', ...sectionDivider }} className="print-break">
                            <div style={{ fontSize: 14, fontWeight: 800, color: INK }}>安全に関するご案内</div>
                            <div style={{ fontSize: 12.5, color: SUB, lineHeight: 1.7, marginTop: 8 }}>本ツアーはモンゴルの自然地域・砂漠地帯・オフロードエリアを含む<b style={{ color: '#24262B' }}>特殊地域旅行</b>です。旅行中に発生し得る疾病・事故・追加滞在費用・現地でのご協力事項について事前にご案内し、お客様に不利益が生じないよう努めております。ご契約前に必ず内容をご確認いただき、ご理解・ご同意のうえお申し込みください。</div>

                            <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginTop: 18 }}>医療機関について</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
                                <Bullet>モンゴルの医療水準・設備は日本と比べ十分とは言えず、高度な治療や手術が必要な場合は海外での治療が必要となることがあります。</Bullet>
                                <Bullet>ウランバートル市外では医療施設が限られ、搬送に時間を要する場合があります。</Bullet>
                                <Bullet>旅行中は体調・安全管理に十分ご注意ください。救急車が必要な場合は <a href="tel:103" style={{ color: RED, fontWeight: 700, textDecoration: 'none' }}>103</a> へご連絡ください。</Bullet>
                            </div>

                            <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginTop: 18 }}>本確認書の目的</div>
                            <div style={{ fontSize: 12.5, color: SUB, lineHeight: 1.7, marginTop: 8 }}>自然環境の厳しい地域を訪問する特殊地域旅行のため、ご参加前に現地の特性やリスクをご理解いただき、健康状態に問題がないことをご確認いただくものです。天候・自然災害・交通事情等により追加滞在費用が発生する可能性についても事前にご理解いただき、トラブル防止を目的としております。特定のお客様を制限するものではありません。<b style={{ color: '#24262B' }}>ご家族にも旅行先・日程・期間を共有のうえご参加ください。</b></div>
                        </div>

                        {/* ── 健康・疾病リスク ── */}
                        <div style={{ padding: '20px 22px', ...sectionDivider }} className="print-break">
                            <div style={{ background: WARN_BG, borderRadius: 14, padding: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ fontSize: 15 }}>⚠️</span><span style={{ fontSize: 14, fontWeight: 800, color: WARN_TITLE }}>健康および疾病リスク</span></div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                                    {[
                                        '地方部は未舗装道路が非常に多く、道路状況が良好ではありません。',
                                        'シートベルト未着用による事故・負傷は、旅行会社・ドライバー・ガイドは責任を負いかねます。',
                                        '近年の異常気象により、朝晩の寒暖差が大きい場合があります。',
                                        '長時間の車移動により疲労が蓄積する場合があります。',
                                        '市外では医療施設が少なく、緊急時に十分な医療を受けられない可能性があります。',
                                        'オフロード走行や山岳地帯の移動があり、事故の危険性や車両の大きな揺れが発生する場合があります。',
                                        '飲料水や屋台等の衛生環境により体調を崩す可能性があります。',
                                        '各種アクティビティ（乗馬・ラクダ・サンドボード等）への参加はお客様ご自身の判断によるものであり、安全管理はご本人の責任となります。',
                                    ].map((t, i) => <Bullet key={i} n={i + 1} color={WARN_BULLET}>{t}</Bullet>)}
                                </div>
                            </div>

                            <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginTop: 18 }}>以下に該当する方は、ご契約前に医師へご相談ください</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
                                {[
                                    '腰椎ヘルニア、変形性疾患、高血圧、心疾患、腎疾患、その他持病をお持ちの方',
                                    'がん治療中の方、または旅行中に重大な健康上の問題が発生する可能性のある方',
                                    '生命維持に関わる薬剤を使用中の方',
                                    '妊娠中の方',
                                ].map((t, i) => <Bullet key={i} n={i + 1}>{t}</Bullet>)}
                            </div>

                            <div style={{ marginTop: 16, padding: '13px 15px', background: BLUE_BG, borderRadius: 12 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: BLUE_DK }}>75歳以上のお客様へ</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                                    <Bullet n={1}><span style={{ color: BLUE_TX }}>未舗装道路が多い特殊地域旅行への参加可否について、必ず主治医へご相談ください。</span></Bullet>
                                    <Bullet n={2}><span style={{ color: BLUE_TX }}>緊急連絡先となるご家族の情報を出発前にご提出ください。</span></Bullet>
                                </div>
                            </div>
                        </div>

                        {/* ── ご契約前の確認・費用・協力 ── */}
                        <div style={{ padding: '20px 22px', ...sectionDivider }} className="print-break">
                            <div style={{ fontSize: 14, fontWeight: 800, color: INK }}>ご契約前の確認事項</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
                                {[
                                    '本旅行が特殊地域旅行であり、一定の危険性を伴うことを理解したうえで参加します。',
                                    '旅行に支障をきたす疾病がないことを確認します。',
                                    '持病や既往症を申告せず参加した場合に発生する問題については自己責任とします。',
                                    '特殊地域の道路事情による危険性を理解し、旅行中は常時シートベルトを着用します。',
                                    '個人行動によりグループから離脱した場合、その時点以降に発生する事故・事件は自己責任とします。',
                                ].map((t, i) => <Bullet key={i} n={i + 1}>{t}</Bullet>)}
                            </div>

                            <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginTop: 18 }}>追加滞在費用発生の可能性について</div>
                            <div style={{ fontSize: 12.5, color: SUB, lineHeight: 1.7, marginTop: 8 }}>以下のような不可抗力により旅程変更や延泊が必要となった場合、発生する追加費用はお客様負担となります。</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                {['自然災害', '洪水', '道路崩壊', '悪天候', '航空会社の欠航', 'ストライキ', '感染症', '政情不安', '国境閉鎖', 'その他予測不能な事態'].map((t, i) => (
                                    <span key={i} style={{ fontSize: 11.5, color: BODY, background: HAIRLINE, padding: '4px 10px', borderRadius: 999 }}>{t}</span>
                                ))}
                            </div>
                            <div style={{ fontSize: 11.5, color: MUTE, lineHeight: 1.7, marginTop: 10 }}>例）豪雨による道路寸断／欠航で移動不可／次の目的地へ移動できず追加宿泊／お客様都合での離脱／安全上の理由でガイド・ドライバーが移動中止を判断／感染症・政変等で旅行継続が不可能 など</div>

                            <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginTop: 18 }}>ガイドおよびスタッフへのご協力</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
                                {[
                                    'ガイド・ドライバー・他のお客様に対する暴言、誹謗中傷、ハラスメント、器物損壊、迷惑行為を行わないことを約束します。',
                                    '団体全体の安全や運営に重大な支障があると判断された場合、ガイドは旅行継続をお断りする権利を有します。',
                                    'その場合、旅行代金の返金は行われません。',
                                    'スタッフへの暴言・脅迫・傷害行為については、法的措置および損害賠償請求の対象となる場合があります。',
                                ].map((t, i) => <Bullet key={i} n={i + 1}>{t}</Bullet>)}
                            </div>

                            <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginTop: 18 }}>海外旅行標準約款 第15条（旅行開始前の契約解除）</div>
                            <div style={{ fontSize: 12.5, color: SUB, lineHeight: 1.7, marginTop: 8 }}>旅行会社または旅行者は、旅行開始前に契約を解除することができます。損害賠償については消費者紛争解決基準および関係法令に基づいて処理されます。また、他の旅行者に著しい迷惑を及ぼす場合・疾病等により参加が困難な場合・旅行代金が期限までに支払われない場合には、旅行会社は契約を解除できるものとします。</div>
                        </div>

                        {/* ── 同意確認 ── */}
                        <div style={{ padding: '20px 22px 26px', ...sectionDivider }} className="print-break">
                            <div style={{ background: SECTION, border: '1px dashed #D7DAE0', borderRadius: 14, padding: 16 }}>
                                <div style={{ fontSize: 12.5, color: '#24262B', lineHeight: 1.75, fontWeight: 600 }}>私は上記内容について十分な説明を受け、本旅行が特殊地域を含む旅行であることを理解し、内容に同意のうえ参加することを確認します。</div>
                            </div>
                            <div style={{ marginTop: 18, textAlign: 'center' }}>
                                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', color: INK }}>MONGOLIA MILKY WAY</div>
                                <div style={{ fontSize: 9, color: FAINT, lineHeight: 1.6, marginTop: 12 }}>{detail.note ? `※ ${detail.note}` : '※ 本日程は現地事情（天候・交通状況など）により変更となる場合がございます。'}</div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* 인쇄 버튼 */}
                <div className="no-print" style={{ position: 'sticky', bottom: 16, marginTop: 18, display: 'flex', justifyContent: 'center' }}>
                    <button
                        onClick={() => window.print()}
                        style={{ display: 'inline-flex', height: 48, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, padding: '0 24px', fontSize: 14, fontWeight: 800, color: '#fff', border: 'none', cursor: 'pointer', background: BLUE, boxShadow: '0 10px 24px rgba(26,140,255,0.4)' }}
                    >
                        🖨 印刷 / PDF保存
                    </button>
                </div>
            </div>
        </>
    );
};
