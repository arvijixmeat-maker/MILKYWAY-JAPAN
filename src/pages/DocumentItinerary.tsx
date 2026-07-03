import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { SEO } from '../components/seo/SEO';
import { normalizeImages } from '../components/document/TripDocParts';
import { COMPANY_INFO, EMBASSY_INFO, LOCAL_EMERGENCY } from '../constants/company';

/**
 * 確定日程表（고객용）— "確定日程表.dc.html"(모바일) + "確定日程表_PC.dc.html"(PC) 디자인 적용.
 * 반응형: ≤768px = 모바일 라이트 커버 단일 컬럼 / PC = 다크 히어로 + 사이드바 + 와이드 레이아웃.
 * DAY 일정은 상품관리에서 올린 **모든 이미지·내용**(스팟별 사진·제목·설명, 숙소 사진·시설, 식사)을 전부 렌더링한다.
 * 견적 페이지(/estimate/:id)가 쓰는 TripDocParts 렌더러와는 독립(공용 컴포넌트 미수정, normalizeImages만 사용).
 */

// ─── 디자인 토큰 ───
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

// ─── 정형 콘텐츠(모바일/PC 공용) ───
const GUIDE_MEETING = [
    'モンゴル国際空港に到着後、入国手続きを終えて到着ロビーへお進みください。',
    'お客様のお名前が書かれたボードを持ったガイドがお待ちしております。',
    'ガイドとのご対面後、いよいよモンゴルの旅が始まります。',
];
const ACTIVITY_NOTICE = [
    '危険を伴う現地アクティビティへの参加は、お客様ご自身の自由意思によるものとなります。',
    '体験中に発生した事故や負傷につきましては、旅行保険の補償対象外となる場合があります。',
    'お客様ご自身の過失による事故と判断された場合、旅行会社には責任および帰責事由がなく、損害賠償等の責任も負いかねますので、あらかじめご了承ください。',
    '上記内容にご同意いただいたお客様のみ、アクティビティへご参加いただけます。現地参加時には免責同意書へのご署名をお願いしております。',
];
const SAFETY_INTRO = '本ツアーはモンゴルの自然地域・砂漠地帯・オフロードエリアを含む特殊地域旅行です。旅行中に発生し得る疾病・事故・追加滞在費用・現地でのご協力事項について事前にご案内し、お客様に不利益が生じないよう努めております。ご契約前に必ず内容をご確認いただき、ご理解・ご同意のうえお申し込みください。';
const MEDICAL_NOTES = [
    'モンゴルの医療水準・設備は日本と比べ十分とは言えず、高度な治療や手術が必要な場合は海外での治療が必要となることがあります。',
    'ウランバートル市外では医療施設が限られ、搬送に時間を要する場合があります。',
    '旅行中は体調・安全管理に十分ご注意ください。救急車が必要な場合は 103 へご連絡ください。',
];
const CONFIRM_PURPOSE = '自然環境の厳しい地域を訪問する特殊地域旅行のため、ご参加前に現地の特性やリスクをご理解いただき、健康状態に問題がないことをご確認いただくものです。天候・自然災害・交通事情等により追加滞在費用が発生する可能性についても事前にご理解いただき、トラブル防止を目的としております。特定のお客様を制限するものではありません。ご家族にも旅行先・日程・期間を共有のうえご参加ください。';
const HEALTH_RISKS = [
    '地方部は未舗装道路が非常に多く、道路状況が良好ではありません。',
    'シートベルト未着用による事故・負傷は、旅行会社・ドライバー・ガイドは責任を負いかねます。',
    '近年の異常気象により、朝晩の寒暖差が大きい場合があります。',
    '長時間の車移動により疲労が蓄積する場合があります。',
    '市外では医療施設が少なく、緊急時に十分な医療を受けられない可能性があります。',
    'オフロード走行や山岳地帯の移動があり、事故の危険性や車両の大きな揺れが発生する場合があります。',
    '飲料水や屋台等の衛生環境により体調を崩す可能性があります。',
    '各種アクティビティ（乗馬・ラクダ・サンドボード等）への参加はお客様ご自身の判断によるものであり、安全管理はご本人の責任となります。',
];
const MEDICAL_CONSULT = [
    '腰椎ヘルニア、変形性疾患、高血圧、心疾患、腎疾患、その他持病をお持ちの方',
    'がん治療中の方、または旅行中に重大な健康上の問題が発生する可能性のある方',
    '生命維持に関わる薬剤を使用中の方',
    '妊娠中の方',
];
const SENIOR_NOTES = [
    '未舗装道路が多い特殊地域旅行への参加可否について、必ず主治医へご相談ください。',
    '緊急連絡先となるご家族の情報を出発前にご提出ください。',
];
const PRECONTRACT = [
    '本旅行が特殊地域旅行であり、一定の危険性を伴うことを理解したうえで参加します。',
    '旅行に支障をきたす疾病がないことを確認します。',
    '持病や既往症を申告せず参加した場合に発生する問題については自己責任とします。',
    '特殊地域の道路事情による危険性を理解し、旅行中は常時シートベルトを着用します。',
    '個人行動によりグループから離脱した場合、その時点以降に発生する事故・事件は自己責任とします。',
];
const ADDITIONAL_COST_TAGS = ['自然災害', '洪水', '道路崩壊', '悪天候', '航空会社の欠航', 'ストライキ', '感染症', '政情不安', '国境閉鎖', 'その他予測不能な事態'];
const ADDITIONAL_COST_EXAMPLE = '例）豪雨による道路寸断／欠航で移動不可／次の目的地へ移動できず追加宿泊／お客様都合での離脱／安全上の理由でガイド・ドライバーが移動中止を判断／感染症・政変等で旅行継続が不可能 など';
const COOPERATION = [
    'ガイド・ドライバー・他のお客様に対する暴言、誹謗中傷、ハラスメント、器物損壊、迷惑行為を行わないことを約束します。',
    '団体全体の安全や運営に重大な支障があると判断された場合、ガイドは旅行継続をお断りする権利を有します。',
    'その場合、旅行代金の返金は行われません。',
    'スタッフへの暴言・脅迫・傷害行為については、法的措置および損害賠償請求の対象となる場合があります。',
];
const CANCELLATION_CLAUSE = '旅行会社または旅行者は、旅行開始前に契約を解除することができます。損害賠償については消費者紛争解決基準および関係法令に基づいて処理されます。また、他の旅行者に著しい迷惑を及ぼす場合・疾病等により参加が困難な場合・旅行代金が期限までに支払われない場合には、旅行会社は契約を解除できるものとします。';
const AGREEMENT_TEXT = '私は上記内容について十分な説明を受け、本旅行が特殊地域を含む旅行であることを理解し、内容に同意のうえ参加することを確認します。';

interface Activity { time?: string; type?: string; title: string; description?: string; images?: string[] | string; }
interface DayData {
    day: number; title: string; region?: string; summary?: string;
    activities: Activity[];
    meals?: { breakfast?: string; lunch?: string; dinner?: string };
    accommodation: { id?: string; name: string; type?: string; location?: string; images?: string[] | string; description?: string; facilities?: string[] | string } | null;
}
interface DocumentSettings {
    overview?: { heroTagline?: string; intro?: string; includedText?: string; excludedText?: string };
    detail?: { title?: string; note?: string };
    guide?: { guidePhone?: string; emergencyPhone?: string };
}
interface ItineraryData {
    reservation: { id: string; reservationNumber: string | null; productName: string; customerName: string; travelers: number; startDate: string; endDate: string; status: string };
    template: { id: string; name: string; description: string; days: any[]; documentSettings?: DocumentSettings } | null;
    guide: { id?: string; name: string; image?: string; phone?: string; languages?: string[] | string } | null;
    days: DayData[];
    productIncluded?: string[];
    productExcluded?: string[];
}
// 가이드 控え(관리자→localStorage 전달, 고객 미노출)
interface GuideExtra {
    customerName?: string;
    people?: string;
    arrival?: string;
    departure?: string;
    guideName?: string;
    guidePhone?: string;
    vehicleType?: string;
    vehiclePhone?: string;
    memos?: string[];
}

const formatRange = (start?: string, end?: string) => {
    const f = (iso?: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso || '';
        const wd = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
        return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}(${wd})`;
    };
    const s = f(start), e = f(end);
    return (!s && !e) ? '—' : `${s}〜${e}`;
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
    const s = new Date(start), e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
    const nights = Math.round((e.getTime() - s.getTime()) / 86400000);
    return nights >= 0 ? { nights, days: nights + 1 } : null;
};
const splitItems = (t?: string) => (t || '').split(/\r?\n|、|,/).map(x => x.trim()).filter(Boolean);
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

const useIsMobile = () => {
    const [m, setM] = useState<boolean>(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));
    useEffect(() => {
        const onResize = () => setM(window.innerWidth <= 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    return m;
};

// ─── 공용 소형 컴포넌트 ───
const Bullet: React.FC<{ n?: React.ReactNode; color?: string; children: React.ReactNode }> = ({ n = '・', color = BLUE, children }) => (
    <div style={{ display: 'flex', gap: 9, fontSize: 12.5, color: BODY, lineHeight: 1.7 }}>
        <span style={{ color, fontWeight: 700, flex: 'none' }}>{n}</span>
        <span style={{ flex: 1 }}>{children}</span>
    </div>
);
const IncludeItem: React.FC<{ ok: boolean; text: string }> = ({ ok, text }) => {
    const { title, desc } = splitTitleDesc(text);
    return (
        <div style={{ display: 'flex', gap: 11 }}>
            <span style={{ width: 22, height: 22, flex: 'none', borderRadius: '50%', background: ok ? GREEN_BG : RED_BG, color: ok ? GREEN : RED, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: ok ? 13 : 12, fontWeight: 800 }}>{ok ? '✓' : '✕'}</span>
            <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{title}</div>
                {desc && <div style={{ fontSize: 12.5, color: SUB, lineHeight: 1.7, marginTop: 3 }}>{desc}</div>}
            </div>
        </div>
    );
};

// 한 DAY의 스팟별 이미지·내용을 전부 렌더 (상품관리 콘텐츠 풀 노출)
const DayBody: React.FC<{ day: DayData; m: boolean }> = ({ day, m }) => {
    const acts = day.activities || [];
    const accImgs = normalizeImages(day.accommodation?.images);
    const facilities = asArray(day.accommodation?.facilities);
    const meals: Array<{ k: 'breakfast' | 'lunch' | 'dinner'; l: string }> = [{ k: 'breakfast', l: '朝' }, { k: 'lunch', l: '昼' }, { k: 'dinner', l: '夕' }];
    const imgH = m ? undefined : 200;
    return (
        <>
            {day.summary && <div style={{ fontSize: m ? 12.5 : 13.5, color: SUB, lineHeight: 1.7, marginTop: 10 }}>{day.summary}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: m ? 14 : 16, marginTop: 14 }}>
                {acts.length === 0 && <div style={{ fontSize: 12.5, color: FAINT }}>調整中</div>}
                {acts.map((a, k) => {
                    const imgs = normalizeImages(a.images);
                    return (
                        <div key={k}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                                {a.time && <span style={{ fontSize: m ? 11 : 13, fontWeight: 800, color: BLUE, flex: 'none' }}>{a.time}</span>}
                                <span style={{ fontSize: m ? 13.5 : 15, fontWeight: 700, color: INK }}>{a.title}</span>
                            </div>
                            {imgs.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: imgs.length === 1 ? '1fr' : '1fr 1fr', gap: m ? 8 : 12, marginTop: 10 }}>
                                    {imgs.map((src, j) => (
                                        <img key={j} src={src} alt={a.title || ''} loading="lazy" decoding="async"
                                            style={{ width: '100%', height: imgH, aspectRatio: m ? '4 / 3' : undefined, objectFit: 'cover', borderRadius: m ? 12 : 14, display: 'block' }} />
                                    ))}
                                </div>
                            )}
                            {a.description && <div style={{ fontSize: m ? 12.5 : 13.5, color: SUB, lineHeight: 1.7, marginTop: imgs.length ? 8 : 3, paddingLeft: a.time && !imgs.length ? (m ? 30 : 48) : 0 }}>{a.description}</div>}
                        </div>
                    );
                })}
            </div>

            {/* 숙소 + 식사 */}
            <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : '1fr 1fr', gap: m ? 10 : 14, marginTop: 16, alignItems: 'start' }}>
                {day.accommodation?.name ? (
                    <div style={{ background: SECTION, borderRadius: 13, padding: m ? 12 : '13px 15px' }}>
                        <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                            {accImgs[0]
                                ? <img src={accImgs[0]} alt={day.accommodation.name} loading="lazy" style={{ width: 46, height: 46, flex: 'none', borderRadius: 11, objectFit: 'cover' }} />
                                : <div style={{ width: 46, height: 46, flex: 'none', borderRadius: 11, background: 'linear-gradient(150deg,#b9c4d2,#7d8a99)' }} />}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: MUTE }}>🛏 ご宿泊</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginTop: 2 }}>
                                    {day.accommodation.name}
                                    {day.accommodation.location && <span style={{ fontSize: 11, fontWeight: 600, color: FAINT, marginLeft: 6 }}>（{day.accommodation.location}）</span>}
                                </div>
                                {facilities.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                        {facilities.map((f, j) => <span key={j} style={{ fontSize: 11.5, color: BODY, background: '#fff', border: `1px solid ${BORDER}`, padding: '3px 9px', borderRadius: 999 }}>{f}</span>)}
                                    </div>
                                )}
                                {day.accommodation.description && <div style={{ fontSize: 12, color: SUB, lineHeight: 1.6, marginTop: 6 }}>{day.accommodation.description}</div>}
                            </div>
                        </div>
                    </div>
                ) : <div />}
                <div style={{ display: 'flex', gap: 8 }}>
                    {meals.map(mm => {
                        const v = (day.meals as any)?.[mm.k];
                        return (
                            <span key={mm.k} style={{ flex: 1, textAlign: 'center', padding: m ? '7px 0' : '8px 0', background: v ? BLUE_BG : SECTION, borderRadius: 10, fontSize: m ? 11.5 : 12.5, color: v ? BLUE_DK : FAINT, fontWeight: v ? 700 : 400 }}>
                                {mm.l} {v || '—'}
                            </span>
                        );
                    })}
                </div>
            </div>
        </>
    );
};

export const DocumentItinerary: React.FC = () => {
    const { reservationId } = useParams();
    const [searchParams] = useSearchParams();
    const guideMode = searchParams.get('guide') === '1';
    // 가이드 인쇄는 항상 라이트(모바일) 레이아웃 — PC 다크 히어로는 브라우저 "배경 그래픽"
    // 옵션이 꺼지면 흰 글자가 흰 배경에 찍혀 사라진다. 라이트 레이아웃은 배경 옵션과 무관하게 안전.
    const isMobileScreen = useIsMobile();
    const m = guideMode ? true : isMobileScreen;
    const [data, setData] = useState<ItineraryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!reservationId) return;
        (async () => {
            try { setData(await api.documents.itinerary.get(reservationId)); }
            catch (e: any) { setError(e.message || '日程表を読み込めませんでした。'); }
            finally { setLoading(false); }
        })();
    }, [reservationId]);

    useEffect(() => {
        const id = 'doc-noto-sans-jp';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id; link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;800;900&display=swap';
        document.head.appendChild(link);
    }, []);

    // ── ガイド控えモード ──
    // 관리자에서 "가이드 PDF"로 열면 ?guide=1 로 들어온다. 가이드 전용 정보(항공편·
    // 요청메모·담당가이드·차량)는 고객용 API 응답에 포함되지 않으므로, 관리자 브라우저의
    // localStorage 로만 전달한다(같은 origin·일회성). 고객은 이 데이터가 없어 절대 노출되지 않는다.
    const [guideExtra, setGuideExtra] = useState<GuideExtra | null>(null);
    useEffect(() => {
        if (!guideMode || !reservationId) return;
        try {
            const raw = localStorage.getItem(`guideDoc:${reservationId}`);
            if (raw) { setGuideExtra(JSON.parse(raw)); localStorage.removeItem(`guideDoc:${reservationId}`); }
        } catch { /* ignore */ }
    }, [guideMode, reservationId]);
    // 데이터가 그려진 뒤 자동 인쇄(관리자가 바로 PDF 저장할 수 있도록). 수동 인쇄 버튼도 유지된다.
    // lazy 이미지가 인쇄 전에 로드되도록 강제 eager + 로드 완료 대기(최대 4초 캡).
    useEffect(() => {
        if (searchParams.get('autoprint') !== '1' || loading || error || !data) return;
        let printed = false;
        const doPrint = () => { if (printed) return; printed = true; try { window.focus(); window.print(); } catch { /* 수동 인쇄 */ } };
        const kick = window.setTimeout(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            imgs.forEach((im) => { try { im.loading = 'eager'; const s = im.getAttribute('src'); if (s && !im.complete) im.setAttribute('src', s); } catch { /* noop */ } });
            const pending = imgs.filter((im) => !im.complete);
            if (pending.length === 0) { window.setTimeout(doPrint, 300); return; }
            let remaining = pending.length;
            const onDone = () => { remaining -= 1; if (remaining <= 0) window.setTimeout(doPrint, 300); };
            pending.forEach((im) => { im.addEventListener('load', onDone, { once: true }); im.addEventListener('error', onDone, { once: true }); });
            window.setTimeout(doPrint, 4000); // 하드 캡: 일부 이미지가 안 떠도 인쇄는 진행
        }, 500);
        return () => window.clearTimeout(kick);
    }, [searchParams, loading, error, data]);

    if (loading) {
        return (<>
            <SEO title="確定日程表" description="お客様専用の旅行日程表です。" robots="noindex, nofollow" />
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: PAGE_BG }}>
                <div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: '#d6d3cb', borderTopColor: BLUE }} />
            </div>
        </>);
    }
    if (error || !data) {
        return (<>
            <SEO title="確定日程表" description="お客様専用の旅行日程表です。" robots="noindex, nofollow" />
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: PAGE_BG }}>
                <div style={{ maxWidth: 360, background: '#fff', borderRadius: 4, padding: 28, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
                    <div style={{ fontSize: 40 }}>🗓</div>
                    <p style={{ marginTop: 10, fontSize: 17, fontWeight: 800, color: INK }}>日程表を表示できません</p>
                    <p style={{ marginTop: 4, fontSize: 13, color: SUB }}>{error || 'URLをご確認ください。'}</p>
                </div>
            </div>
        </>);
    }

    const { reservation, template, guide, days } = data;
    const settings = template?.documentSettings || {};
    const overview = settings.overview || {};
    const detail = settings.detail || {};
    const guideSettings = settings.guide || {};
    const duration = computeDuration(reservation.startDate, reservation.endDate);
    const durationChip = duration ? `${duration.nights}泊${duration.days}日` : `全${days.length}日間`;
    const title = template?.name || reservation.productName;
    const subtitle = overview.heroTagline || template?.description || '中央モンゴルの大自然と文化を体験する特別な旅へ。日本語ガイド同行。';

    const productInc = data.productIncluded || [];
    const productExc = data.productExcluded || [];
    const includedDisplay = productInc.length ? productInc : (splitItems(overview.includedText).length ? splitItems(overview.includedText)
        : ['空港送迎・専用車', '全日程の宿泊（ホテル・ゲル）', '日程表内のお食事', '日本語ガイド同行', '観光入場料・各種体験']);
    const excludedDisplay = productExc.length ? productExc : (splitItems(overview.excludedText).length ? splitItems(overview.excludedText)
        : ['国際線航空券', '海外旅行保険', '個人的な費用（お土産・飲み物など）', 'ガイド・ドライバーへのチップ']);

    const officePhone1 = COMPANY_INFO.phoneKR;
    const officePhone2 = guideSettings.emergencyPhone || guide?.phone || COMPANY_INFO.phoneSecondary;
    const telHref = (p: string) => `tel:${p.replace(/[^+\d]/g, '')}`;

    const infoItems: Array<{ label: string; value: string }> = [
        { label: 'お客様名', value: `${reservation.customerName || '—'} 様` },
        { label: 'ご旅行期間', value: formatRange(reservation.startDate, reservation.endDate) },
        { label: 'ご人数', value: `${reservation.travelers || '-'}名` },
        { label: 'ガイド', value: guide?.name || '日本語ガイド' },
        { label: '車両', value: '専用車' },
    ];

    const eyebrow = (color: string): React.CSSProperties => ({ fontSize: m ? 11 : 12, fontWeight: 700, letterSpacing: '0.16em', color });
    const h2: React.CSSProperties = { fontSize: m ? 18 : 26, fontWeight: 800, color: INK, marginTop: 5 };
    const blockTitle: React.CSSProperties = { fontSize: m ? 14 : 16, fontWeight: 800, color: INK };
    const prose: React.CSSProperties = { fontSize: m ? 12.5 : 13.5, color: SUB, lineHeight: 1.8, marginTop: 8 };
    const pad = m ? '20px 18px' : '38px 56px';

    // ─── DAY 타임라인 ───
    const itinerary = (
        <div>
            <div style={eyebrow(BLUE)}>TOUR ITINERARY</div>
            <h2 style={h2}>{detail.title || 'ご旅行日程表'}</h2>
            {/* 가이드 대면 */}
            <div style={{ marginTop: 16, background: BLUE_BG, borderRadius: 16, padding: m ? 16 : '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: m ? 16 : 19 }}>🤝</span><span style={{ fontSize: m ? 14 : 16, fontWeight: 800, color: BLUE_DK }}>ガイドとのご対面</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : '1fr 1fr 1fr', gap: m ? 8 : 16, marginTop: m ? 10 : 14 }}>
                    {GUIDE_MEETING.map((tx, i) => <div key={i} style={{ fontSize: m ? 11.5 : 13.5, color: BLUE_TX, lineHeight: 1.7 }}>{tx}</div>)}
                </div>
            </div>
            {/* 타임라인 */}
            <div style={{ position: 'relative', marginTop: m ? 18 : 28, paddingLeft: m ? 26 : 34 }}>
                <div style={{ position: 'absolute', left: m ? 5 : 7, top: 8, bottom: 8, width: 2, background: BORDER }} />
                {days.length === 0 ? (
                    <div style={{ padding: '8px 0', fontSize: 13, color: MUTE }}>日程は現在準備中です。</div>
                ) : days.map((day, i) => {
                    const dayNum = day.day || i + 1;
                    const dstr = dayDate(reservation.startDate, dayNum);
                    return (
                        <div key={dayNum} style={{ position: 'relative', marginBottom: i === days.length - 1 ? 0 : (m ? 18 : 28) }} className="print-break">
                            <div style={{ position: 'absolute', left: m ? -26 : -34, top: 4, width: m ? 12 : 16, height: m ? 12 : 16, borderRadius: '50%', background: BLUE, boxShadow: `0 0 0 ${m ? 3 : 4}px ${BLUE_BG}` }} />
                            <div style={{ background: '#fff', border: `1px solid #EDEFF2`, borderRadius: m ? 14 : 18, boxShadow: '0 2px 12px rgba(26,27,30,.05)', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: m ? 10 : 14, padding: m ? '16px 16px 0' : '22px 26px 0' }}>
                                    <span style={{ fontSize: m ? 30 : 48, fontWeight: 900, color: BLUE, lineHeight: 0.9, letterSpacing: '-0.03em' }}>{String(dayNum).padStart(2, '0')}</span>
                                    <div style={{ paddingBottom: 4 }}>
                                        <div style={{ fontSize: m ? 11 : 12, fontWeight: 700, letterSpacing: '0.08em', color: MUTE }}>DAY {dayNum}{dstr ? ` · ${dstr}` : ''}{day.region ? ` · ${day.region}` : ''}</div>
                                        <div style={{ fontSize: m ? 17 : 22, fontWeight: 800, color: INK, marginTop: 2 }}>{day.title || `${dayNum}日目`}</div>
                                    </div>
                                </div>
                                <div style={{ padding: m ? '14px 16px 18px' : '20px 26px 26px' }}>
                                    <DayBody day={day} m={m} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // ─── ご旅行情報 ───
    const infoBlock = m ? (
        <div style={{ padding: '20px 18px', borderTop: `8px solid ${SECTION}` }} className="print-break">
            <div style={{ ...blockTitle, marginBottom: 12 }}>ご旅行情報</div>
            {infoItems.map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: i === infoItems.length - 1 ? 'none' : `1px solid ${HAIRLINE}`, gap: 16 }}>
                    <span style={{ fontSize: 13, color: MUTE, flex: 'none' }}>{it.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: INK, textAlign: 'right' }}>{it.value}</span>
                </div>
            ))}
        </div>
    ) : (
        <div style={{ padding: '0 56px', marginTop: -16 }}>
            <div style={{ background: '#fff', border: '1px solid #EDEFF2', borderRadius: 16, padding: '22px 28px', boxShadow: '0 2px 12px rgba(26,27,30,.05)' }}>
                <div style={{ ...blockTitle, marginBottom: 16 }}>ご旅行情報</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.7fr 0.7fr 1.1fr 0.8fr' }}>
                    {infoItems.map((it, i) => (
                        <div key={i} style={{ padding: i === 0 ? '0 24px 0 0' : i === infoItems.length - 1 ? '0 0 0 24px' : '0 24px', borderLeft: i === 0 ? 'none' : `1px solid ${HAIRLINE}` }}>
                            <div style={{ fontSize: 11, color: MUTE, marginBottom: 6 }}>{it.label}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>{it.value}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // ─── 포함/불포함 + 주의/보험 ───
    const includedBlock = (
        <div style={{ padding: pad, borderTop: m ? `8px solid ${SECTION}` : `1px solid #EDEFF2` }} className="print-break">
            <div style={eyebrow(GREEN)}>WHAT'S INCLUDED</div>
            <h2 style={h2}>料金に含まれるもの</h2>
            <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : '1fr 1fr', gap: m ? 13 : '20px 48px', marginTop: m ? 14 : 24 }}>
                {includedDisplay.map((t, i) => <IncludeItem key={i} ok text={t} />)}
            </div>
            <h2 style={{ ...h2, fontSize: m ? 16 : 20, marginTop: m ? 22 : 36 }}>含まれないもの</h2>
            <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : '1fr 1fr', gap: m ? 13 : '16px 48px', marginTop: m ? 14 : 16 }}>
                {excludedDisplay.map((t, i) => <IncludeItem key={i} ok={false} text={t} />)}
            </div>

            {/* 활동 주의 + 보험 안내 — 가이드 모드에서는 숨김(안전/보험 안내 제외) */}
            {!guideMode && (
            <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : '1.4fr 1fr', gap: m ? 12 : 16, marginTop: m ? 16 : 24 }}>
                <div style={{ background: WARN_BG, borderRadius: 16, padding: m ? 16 : '22px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><span style={{ fontSize: m ? 15 : 17 }}>⚠️</span><span style={{ fontSize: m ? 13.5 : 15, fontWeight: 800, color: WARN_TITLE }}>現地アクティビティ参加に関するご案内</span><span style={{ fontSize: m ? 11.5 : 12, color: WARN_SUB }}>乗馬・ラクダ乗り・サンドボード</span></div>
                    <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : '1fr 1fr', gap: m ? 8 : '10px 20px', marginTop: m ? 12 : 14 }}>
                        {ACTIVITY_NOTICE.map((tx, i) => <Bullet key={i} color={WARN_BULLET}>{tx}</Bullet>)}
                    </div>
                </div>
                <div style={{ background: BLUE_BG, borderRadius: 16, padding: m ? 16 : '22px 24px' }}>
                    <div style={{ fontSize: m ? 13.5 : 15, fontWeight: 800, color: BLUE_DK }}>☞ 海外旅行保険には必ずご加入ください</div>
                    <div style={{ fontSize: m ? 12.5 : 13, color: BLUE_TX, lineHeight: 1.75, marginTop: 10 }}>万が一の事故や病気、手荷物の紛失などに備え、ご出発前に海外旅行保険へ必ずご加入いただきますようお願いいたします。</div>
                </div>
            </div>
            )}
        </div>
    );

    // ─── 海外安全情報 ───
    const safetyBlock = (
        <div style={{ padding: m ? '24px 18px 26px' : '36px 56px 44px', borderTop: m ? `8px solid ${SECTION}` : `1px solid #EDEFF2` }} className="print-break">
            <div style={eyebrow(RED)}>SAFETY &amp; EMERGENCY</div>
            <h2 style={h2}>海外安全情報・ご案内事項</h2>

            {/* 긴급 연락처 (블랙) */}
            <div style={{ marginTop: m ? 16 : 22, background: INK, borderRadius: 16, padding: m ? 18 : '26px 30px', color: '#fff', display: 'grid', gridTemplateColumns: m ? '1fr' : '1.1fr 1.5fr', gap: m ? 18 : 36, alignItems: 'center' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: RED, boxShadow: '0 0 0 4px rgba(255,79,79,.25)' }} /><span style={{ fontSize: m ? 14 : 16, fontWeight: 800 }}>緊急時の連絡先</span></div>
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.65)', lineHeight: 1.65, marginTop: 10 }}>現地状況は刻々と変化するため、現地総括責任者が常時管理しております。ご出発前に <b style={{ color: '#fff' }}>LINE／カカオトーク</b> の連絡先をご案内いたします。</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', letterSpacing: '0.06em', marginTop: 16 }}>現地オフィス（日本語対応可）</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: m ? 10 : 20, marginTop: 8 }}>
                        <a href={telHref(officePhone1)} style={{ textDecoration: 'none', color: '#fff', fontSize: m ? 16 : 18, fontWeight: 800 }}>📞 {officePhone1}</a>
                        {officePhone2 && officePhone2 !== officePhone1 && <a href={telHref(officePhone2)} style={{ textDecoration: 'none', color: '#fff', fontSize: m ? 16 : 18, fontWeight: 800 }}>{officePhone2}</a>}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', letterSpacing: '0.06em', marginBottom: 10 }}>現地緊急通報先</div>
                    <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 10 }}>
                        {LOCAL_EMERGENCY.map(e => (
                            <a key={e.number} href={telHref(e.number)} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(255,255,255,.07)', borderRadius: 11, padding: '12px 14px' }}>
                                <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,.65)' }}>{e.label}</span>
                                <span style={{ fontSize: 22, fontWeight: 800, color: '#FF7A7A' }}>{e.number}</span>
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            {/* 대사관 + 회사 */}
            <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : '1fr 1fr', gap: m ? 12 : 16, marginTop: m ? 12 : 22 }}>
                <div style={{ padding: m ? 16 : '20px 22px', background: SECTION, borderRadius: 14 }}>
                    <div style={{ fontSize: m ? 14 : 15, fontWeight: 800, color: INK }}>{EMBASSY_INFO.nameJa}</div>
                    <div style={{ fontSize: 13, color: SUB, lineHeight: 1.6, marginTop: 8 }}>{EMBASSY_INFO.addressJa}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 13, color: MUTE }}>代表電話</span><a href={telHref(EMBASSY_INFO.phone)} style={{ fontSize: 14, fontWeight: 700, color: BLUE, textDecoration: 'none' }}>{EMBASSY_INFO.phone}</a></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 13, color: MUTE }}>緊急（24時間）</span><a href={telHref(EMBASSY_INFO.emergencyPhone)} style={{ fontSize: 14, fontWeight: 700, color: BLUE, textDecoration: 'none' }}>{EMBASSY_INFO.emergencyPhone}</a></div>
                    </div>
                </div>
                <div style={{ padding: m ? 16 : '20px 22px', background: SECTION, borderRadius: 14 }}>
                    <div style={{ fontSize: m ? 14 : 15, fontWeight: 800, color: INK, marginBottom: 10 }}>会社情報</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '7px 16px' }}>
                        {[['商号', COMPANY_INFO.nameLegal], ['代表者', COMPANY_INFO.ceo], ['事業者登録', COMPANY_INFO.registrationNumber], ['観光事業登録', COMPANY_INFO.tourRegistrationNumber], ['所在地', COMPANY_INFO.addressJa]].map(([k, v]) => (
                            <React.Fragment key={k}>
                                <span style={{ fontSize: 13, color: MUTE }}>{k}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#24262B', lineHeight: 1.5 }}>{v}</span>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            {/* 안전 안내 + 의료 + 목적 + 계약전확인 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: m ? 18 : 22, marginTop: m ? 20 : 28 }}>
                <div><div style={blockTitle}>安全に関するご案内</div><div style={prose}>{SAFETY_INTRO}</div></div>
                <div>
                    <div style={blockTitle}>医療機関について</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>{MEDICAL_NOTES.map((tx, i) => <Bullet key={i}>{tx}</Bullet>)}</div>
                </div>
                <div><div style={blockTitle}>本確認書の目的</div><div style={prose}>{CONFIRM_PURPOSE}</div></div>
                <div>
                    <div style={blockTitle}>ご契約前の確認事項</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>{PRECONTRACT.map((tx, i) => <Bullet key={i} n={i + 1}>{tx}</Bullet>)}</div>
                </div>
            </div>

            {/* 건강·질병 리스크 */}
            <div style={{ marginTop: m ? 18 : 22, background: WARN_BG, borderRadius: 16, padding: m ? 16 : '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: m ? 15 : 16 }}>⚠️</span><span style={{ fontSize: m ? 14 : 15, fontWeight: 800, color: WARN_TITLE }}>健康および疾病リスク</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : '1fr 1fr', gap: m ? 8 : '9px 18px', marginTop: 13 }}>
                    {HEALTH_RISKS.map((tx, i) => <Bullet key={i} n={i + 1} color={WARN_BULLET}>{tx}</Bullet>)}
                </div>
            </div>
            <div style={{ marginTop: m ? 18 : 22 }}>
                <div style={blockTitle}>ご契約前に医師へご相談いただきたい方</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>{MEDICAL_CONSULT.map((tx, i) => <Bullet key={i} n={i + 1}>{tx}</Bullet>)}</div>
            </div>
            <div style={{ marginTop: m ? 14 : 18, background: BLUE_BG, borderRadius: 14, padding: m ? '14px 16px' : '18px 20px' }}>
                <div style={{ fontSize: m ? 13 : 15, fontWeight: 800, color: BLUE_DK }}>75歳以上のお客様へ</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 9 }}>{SENIOR_NOTES.map((tx, i) => <Bullet key={i} n={i + 1}><span style={{ color: BLUE_TX }}>{tx}</span></Bullet>)}</div>
            </div>

            {/* 추가 비용 */}
            <div style={{ marginTop: m ? 20 : 30 }}>
                <div style={blockTitle}>追加滞在費用発生の可能性について</div>
                <div style={prose}>以下のような不可抗力により旅程変更や延泊が必要となった場合、発生する追加費用はお客様負担となります。</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
                    {ADDITIONAL_COST_TAGS.map((tx, i) => <span key={i} style={{ fontSize: 12.5, color: BODY, background: HAIRLINE, padding: '5px 12px', borderRadius: 999 }}>{tx}</span>)}
                </div>
                <div style={{ fontSize: 12.5, color: MUTE, lineHeight: 1.75, marginTop: 10 }}>{ADDITIONAL_COST_EXAMPLE}</div>
            </div>

            {/* 협력 + 약관 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: m ? 20 : 26, marginTop: m ? 20 : 30 }}>
                <div>
                    <div style={blockTitle}>ガイドおよびスタッフへのご協力</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>{COOPERATION.map((tx, i) => <Bullet key={i} n={i + 1}>{tx}</Bullet>)}</div>
                </div>
                <div><div style={blockTitle}>海外旅行標準約款 第15条（旅行開始前の契約解除）</div><div style={prose}>{CANCELLATION_CLAUSE}</div></div>
            </div>

            {/* 동의 */}
            <div style={{ marginTop: m ? 22 : 30, background: SECTION, border: '1px dashed #D7DAE0', borderRadius: 16, padding: m ? '18px 16px' : '24px 28px' }}>
                <div style={{ fontSize: m ? 12.5 : 14, color: '#24262B', lineHeight: 1.8, fontWeight: 600, textAlign: 'center' }}>{AGREEMENT_TEXT}</div>
            </div>
            <div style={{ marginTop: m ? 20 : 26, textAlign: 'center' }}>
                <div style={{ fontSize: m ? 13 : 15, fontWeight: 800, letterSpacing: '0.04em', color: INK }}>MONGOLIA MILKY WAY</div>
                <div style={{ fontSize: m ? 9 : 12, color: FAINT, lineHeight: 1.6, marginTop: 10 }}>{detail.note ? `※ ${detail.note}` : '※ 本日程は現地事情（天候・交通状況など）により変更となる場合がございます。'}</div>
            </div>
        </div>
    );

    // ─── HERO ───
    const heroMobile = (
        <div style={{ padding: '28px 22px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: MUTE }}>
                <span style={{ width: 18, height: 18, borderRadius: 5, background: INK, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11 }}>✦</span>
                MONGOLIA MILKYWAY
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 18, padding: '5px 11px', background: BLUE_BG, color: BLUE_DK, borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: BLUE }} />ご予約確定
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: INK, letterSpacing: '-0.02em', lineHeight: 1.3, marginTop: 12 }}>{title}</div>
            <div style={{ fontSize: 13, color: SUB, lineHeight: 1.6, marginTop: 10 }}>{subtitle}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <span style={{ padding: '6px 12px', border: `1px solid ${BORDER}`, borderRadius: 999, fontSize: 12, fontWeight: 600, color: '#24262B' }}>🗓 {durationChip}</span>
                <span style={{ padding: '6px 12px', border: `1px solid ${BORDER}`, borderRadius: 999, fontSize: 12, fontWeight: 600, color: '#24262B' }}>👤 {reservation.travelers || '-'}名</span>
                <span style={{ padding: '6px 12px', border: `1px solid ${BORDER}`, borderRadius: 999, fontSize: 12, fontWeight: 600, color: '#24262B' }}>🚐 専用車</span>
            </div>
        </div>
    );
    const heroPC = (
        <div style={{ position: 'relative', padding: '48px 56px', background: 'linear-gradient(150deg,#1c2742,#0c1322)', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 82% 18%, rgba(120,150,220,.28), transparent 42%)' }} />
            <div style={{ position: 'relative', maxWidth: 640 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'rgba(255,255,255,.7)', fontSize: 12, fontWeight: 700, letterSpacing: '0.16em' }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,.16)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✦</span>MONGOLIA MILKYWAY
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, padding: '6px 13px', background: 'rgba(255,255,255,.14)', color: '#fff', borderRadius: 999, fontSize: 13, fontWeight: 700 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />ご予約確定
                </div>
                <h1 style={{ margin: '18px 0 0', fontSize: 42, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.25 }}>{title}</h1>
                <div style={{ fontSize: 16, color: 'rgba(255,255,255,.78)', lineHeight: 1.7, marginTop: 14 }}>{subtitle}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
                    {[`🗓 ${durationChip}`, `👤 ${reservation.travelers || '-'}名`, '🚐 専用車'].map((c, i) => (
                        <span key={i} style={{ padding: '8px 15px', background: 'rgba(255,255,255,.12)', color: '#fff', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>{c}</span>
                    ))}
                </div>
            </div>
        </div>
    );

    // ─── ガイド控え(관리자 발행 시에만·상단) ───
    const guideRows: Array<{ label: string; value?: string }> = guideExtra ? [
        { label: 'お客様', value: guideExtra.customerName ? `${guideExtra.customerName} 様` : undefined },
        { label: 'ご人数', value: guideExtra.people },
        { label: '到着便', value: guideExtra.arrival },
        { label: '出発便', value: guideExtra.departure },
        { label: '担当ガイド', value: [guideExtra.guideName, guideExtra.guidePhone].filter(Boolean).join(' · ') || undefined },
        { label: '車両', value: [guideExtra.vehicleType, guideExtra.vehiclePhone].filter(Boolean).join(' · ') || undefined },
    ].filter(r => r.value) : [];
    const guideBlock = guideExtra ? (
        <div className="print-break" style={{ padding: m ? '16px 16px 0' : '24px 56px 0' }}>
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, padding: m ? '14px 15px' : '18px 22px', background: '#FBFCFE' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: m ? 10 : 12 }}>
                    <span style={{ fontSize: m ? 14 : 16 }}>🧭</span>
                    <span style={{ fontSize: m ? 13 : 15, fontWeight: 800, color: INK }}>ガイド控え / Гайдын мэдээлэл</span>
                    <span style={{ fontSize: 11, color: MUTE }}>（お客様控えには表示されません）</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : '1fr 1fr', gap: m ? '8px' : '10px 28px' }}>
                    {guideRows.map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'baseline', borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: 7 }}>
                            <span style={{ fontSize: 12, color: MUTE, flex: 'none', width: m ? 72 : 84 }}>{r.label}</span>
                            <span style={{ fontSize: m ? 13 : 13.5, fontWeight: 700, color: INK }}>{r.value}</span>
                        </div>
                    ))}
                </div>
                {guideExtra.memos && guideExtra.memos.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: WARN_TITLE, marginBottom: 6 }}>⚑ ご要望・メモ（요청사항）</div>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {guideExtra.memos.map((mm, i) => <li key={i} style={{ fontSize: 12.5, color: BODY, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{mm}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    ) : null;

    return (
        <>
            <SEO title="確定日程表" description="お客様専用の旅行日程表です。" robots="noindex, nofollow" />
            <style>{`
                @media print {
                    body { background:#fff !important; }
                    .no-print { display:none !important; }
                    .doc-page { background:#fff !important; padding:0 !important; }
                    .doc-card { box-shadow:none !important; max-width:100% !important; width:100% !important; border-radius:0 !important; }
                    .print-break { break-inside:avoid; page-break-inside:avoid; }
                    /* 인쇄 시 떠 있는 채팅 위젯 숨김 (PDF에 찍히지 않도록) */
                    .floating-line-btn, #ch-plugin-entry, #ch-plugin-launcher { display:none !important; }
                }
                @page { margin:10mm; }
            `}</style>

            <div className="doc-page jp" style={{ minHeight: '100vh', background: PAGE_BG, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: m ? '16px 12px 90px' : '40px 24px 90px', fontFamily: "'Noto Sans JP','Pretendard',sans-serif", boxSizing: 'border-box' }}>
                <div className="doc-card" style={{ width: '100%', maxWidth: m ? 430 : 1120, background: '#fff', borderRadius: m ? 4 : 8, boxShadow: m ? '0 1px 3px rgba(0,0,0,.08)' : '0 4px 24px rgba(26,27,30,.10)', overflow: 'hidden' }}>
                    {m ? heroMobile : heroPC}
                    {guideBlock}
                    {m ? (
                        <>
                            {infoBlock}
                            <div style={{ padding: '22px 18px 8px', borderTop: `8px solid ${SECTION}` }}>{itinerary}</div>
                            {includedBlock}
                            {!guideMode && safetyBlock}
                        </>
                    ) : (
                        <>
                            <div style={{ padding: '40px 56px 8px' }}>{itinerary}</div>
                            {infoBlock}
                            <div style={{ height: 32 }} />
                            {includedBlock}
                            {!guideMode && safetyBlock}
                        </>
                    )}
                </div>

                <div className="no-print" style={{ position: 'sticky', bottom: 16, marginTop: 18, display: 'flex', justifyContent: 'center' }}>
                    <button onClick={() => window.print()} style={{ display: 'inline-flex', height: 48, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, padding: '0 24px', fontSize: 14, fontWeight: 800, color: '#fff', border: 'none', cursor: 'pointer', background: BLUE, boxShadow: '0 10px 24px rgba(26,140,255,0.4)' }}>
                        🖨 印刷 / PDF保存
                    </button>
                </div>
            </div>
        </>
    );
};
