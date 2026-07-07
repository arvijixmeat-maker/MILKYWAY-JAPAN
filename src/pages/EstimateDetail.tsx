import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BottomNav } from '../components/layout/BottomNav';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import { SEO } from '../components/seo/SEO';
import {
    INK, SUB, MUTE, FAINT, BLUE, BLUE_DK, BLUE_BG, GREEN, GREEN_BG, BORDER, HAIRLINE, SECTION, PAGE_BG,
    type DayData, type HeroBadge,
    useIsMobile, DayTimelineBlock, IncludedListsBlock, HeroMobile, HeroPC, InfoBlock, eyebrowStyle, h2Style,
} from '../components/document/ItineraryDocParts';

/**
 * お見積り（맞춤 견적 고객 페이지）— 확정 일정표(DocumentItinerary)와 같은
 * ItineraryDocParts 렌더러·디자인을 사용한다. 견적 → 확정 문서가 같은 구조로 이어지고,
 * 관리자가 편집기에서 넣은 일정(사진·설명 전부)이 그대로 보인다.
 * 견적 전용: 진행 단계·요금(확정가/예약금)·予約リクエスト CTA·ご依頼内容.
 * 안전/보험/약관 안내는 계약 전 단계라 넣지 않는다(확정 일정표에만).
 */

export const EstimateDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [estimate, setEstimate] = useState<any>(null);
    const { showToast, showConfirm } = useToast();
    const m = useIsMobile();

    const handleReservationRequest = async () => {
        const confirmed = await showConfirm({
            title: '予約相談の申し込み',
            message: '予約相談を申し込みますか？\nお申し込み後、担当者が確認してご案内いたします。',
            confirmText: '申し込む',
            cancelText: 'キャンセル',
            type: 'info'
        });

        if (!confirmed) return;

        try {
            const { error } = await (api.quotes as any).update(id, { status: 'reservation_requested' });
            if (error) throw error;

            setEstimate((prev: any) => ({ ...prev, adminStatus: 'reservation_requested', statusLabel: '予約リクエスト済' }));
            showToast('success', '予約相談のお申し込みを受け付けました。担当者が確認後、すぐにご連絡いたします。');
        } catch (error) {
            console.error("Failed to update status:", error);
            showToast('error', 'エラーが発生しました。もう一度お試しください。');
        }
    };

    const handleConfirmReservation = async () => {
        // 1. Confirm Dialog
        const confirmed = await showConfirm({
            title: '予約リクエスト',
            message: 'この見積内容で予約を進めますか？',
            confirmText: '予約リクエスト',
            cancelText: 'キャンセル',
            type: 'info'
        });

        if (!confirmed) return;

        try {
            const me = await api.auth.me();
            if (!me) {
                showToast('error', 'ログインが必要です。');
                navigate('/login');
                return;
            }

            // Navigate to payment page with quote data
            // Parse people count: "성인 3명, 아동 3명" → 3 + 3 = 6
            let totalPeopleCount = 2; // default
            if (estimate.people) {
                const peopleStr = String(estimate.people);
                const matches = peopleStr.match(/\d+/g); // Extract all numbers
                if (matches && matches.length > 0) {
                    totalPeopleCount = matches.reduce((sum, num) => sum + parseInt(num), 0);
                }
            }

            // Use confirmed price from admin if available
            const confirmedTotalPrice = estimate.confirmedPrice || 0;
            // Use admin set deposit if available, otherwise 10% default
            const depositAmount = (estimate.deposit !== undefined && estimate.deposit !== null)
                ? estimate.deposit
                : Math.floor(confirmedTotalPrice * 0.1);
            const localAmount = confirmedTotalPrice - depositAmount;

            navigate('/payment', {
                state: {
                    isQuote: true,
                    quoteId: id,
                    product: {
                        id: id,
                        name: estimate.title || `${estimate.destinations?.[0] || 'オーダーメイド'} 旅行`,
                        duration: estimate.date || '',
                        price: confirmedTotalPrice,
                    },
                    totalPeople: totalPeopleCount,
                    priceBreakdown: {
                        total: confirmedTotalPrice,
                        deposit: depositAmount,
                        local: localAmount
                    },
                    customerInfo: {
                        name: estimate.contact?.name || '',
                        phone: estimate.contact?.phone || '',
                        email: estimate.contact?.email || ''
                    }
                }
            });

        } catch (error) {
            console.error("Failed to proceed:", error);
            showToast('error', 'エラーが発生しました。');
        }
    };

    useEffect(() => {
        // Helper: quote fields like travel_types / accommodations are stored as JSON strings in D1.
        // If the server hasn't parsed them, we parse defensively here.
        const asArr = (val: any): string[] => {
            if (!val) return [];
            if (Array.isArray(val)) return val.filter(Boolean);
            if (typeof val === 'string') {
                const trimmed = val.trim();
                if (trimmed.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        return Array.isArray(parsed) ? parsed.filter(Boolean) : [trimmed];
                    } catch {
                        return [trimmed];
                    }
                }
                // Comma-separated fallback (e.g. "中央モンゴル, ゴビ砂漠")
                return trimmed.split(/,\s*/).filter(Boolean);
            }
            return [];
        };

        const fetchEstimate = async () => {
            try {
                const data = await api.quotes.get(id as string);
                if (!data) return;

                const createdAtRaw = data.created_at || data.createdAt;
                const createdAtDate = createdAtRaw ? new Date(createdAtRaw) : null;
                const createdAtStr = createdAtDate && !isNaN(createdAtDate.getTime())
                    ? createdAtDate.toLocaleDateString('ja-JP')
                    : '—';

                setEstimate({
                    id: data.id,
                    status: data.status,
                    statusLabel:
                        data.status === 'converted' ? '予約確定済' :
                            data.status === 'reservation_requested' ? '予約リクエスト済' :
                                data.status === 'answered' ? 'お見積り到着' :
                                    data.status === 'processing' ? 'お見積り作成中' : '受付完了',
                    adminStatus: data.status,
                    title: data.title || `${data.destination || 'オーダーメイド'} 旅行見積もり`,
                    date: data.travel_dates || data.period,
                    type: data.trip_type || 'オーダーメイド',
                    people: data.travelers || data.headcount,
                    requestDate: createdAtStr,
                    destinations: asArr(data.destination),
                    themes: asArr(data.travel_types ?? data.travelTypes),
                    accommodations: asArr(data.accommodations),
                    vehicle: data.vehicle,
                    priceRange: data.budget,
                    additionalRequest: data.additional_request,
                    contact: { name: data.name, phone: data.phone, email: data.email },
                    estimateUrl: data.estimate_url,
                    adminNote: data.admin_note,
                    confirmedPrice: data.confirmed_price,
                    deposit: data.deposit,
                    confirmedStartDate: data.confirmed_start_date,
                    confirmedEndDate: data.confirmed_end_date,
                    itinerary: data.itinerary || null,
                    documentContent: data.documentContent || null,
                });
            } catch (error) {
                console.error('Error fetching estimate:', error);
            }
        };
        fetchEstimate();
    }, [id]);

    // 確定日程表와 동일한 폰트
    useEffect(() => {
        const fid = 'doc-noto-sans-jp';
        if (document.getElementById(fid)) return;
        const link = document.createElement('link');
        link.id = fid; link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;800;900&display=swap';
        document.head.appendChild(link);
    }, []);

    if (!estimate) {
        return (
            <>
                <SEO title="お見積もり" description="お客様専用のお見積もりページです。" robots="noindex, nofollow" />
                <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: PAGE_BG, fontFamily: "'Noto Sans JP','Pretendard',sans-serif" }}>
                    <div style={{ maxWidth: 360, background: '#fff', borderRadius: 4, padding: 28, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
                        <div style={{ fontSize: 40 }}>📄</div>
                        <p style={{ marginTop: 10, fontSize: 15, fontWeight: 800, color: INK }}>お見積り情報が見つかりません。</p>
                        <button onClick={() => navigate(-1)} style={{ marginTop: 14, fontSize: 13, fontWeight: 800, color: BLUE, background: 'none', border: 'none', cursor: 'pointer' }}>戻る</button>
                    </div>
                </div>
            </>
        );
    }

    // ── 발송 여부/표시용 파생값 ──
    const isSent = estimate.adminStatus === 'answered' || estimate.adminStatus === 'converted' || estimate.status === 'answered' || estimate.adminStatus === 'reservation_requested';
    const isWriting = estimate.adminStatus === 'processing';
    const isConverted = estimate.status === 'converted';
    const quoteNumber = String(estimate.id || '').slice(0, 8).toUpperCase();
    const periodLabel = (estimate.confirmedStartDate && estimate.confirmedEndDate)
        ? `${String(estimate.confirmedStartDate).slice(0, 10)} 〜 ${String(estimate.confirmedEndDate).slice(0, 10)}`
        : (estimate.date || '日程調整中');
    const ds = estimate.documentContent?.documentSettings;
    const splitLines = (t?: string) => (t || '').split(/\r?\n/).map((x: string) => x.trim()).filter(Boolean);
    const includedList = splitLines(ds?.overview?.includedText).length > 0 ? splitLines(ds?.overview?.includedText)
        : ['空港送迎・専用車', '全行程の宿泊（ホテル・ゲル）', '日程表内のお食事', '日本語ガイド', '観光入場料・各種体験'];
    const excludedList = splitLines(ds?.overview?.excludedText).length > 0 ? splitLines(ds?.overview?.excludedText)
        : ['国際線航空券', '海外旅行保険', '個人的な費用（お土産・飲み物など）'];
    const docDays: DayData[] = (estimate.itinerary && Array.isArray(estimate.itinerary.days)) ? estimate.itinerary.days : [];

    const stepDone = [true, isWriting || isSent, isSent];
    const stepLabels = ['お見積り受付', 'お見積り作成', '送信完了'];

    // 상태별 히어로 배지 — 확정 일정표의 「ご予約確定」과 같은 문법
    const heroBadge: HeroBadge = isConverted
        ? { text: 'ご予約確定', bg: GREEN_BG, fg: GREEN, dot: GREEN }
        : estimate.adminStatus === 'reservation_requested'
            ? { text: '予約リクエスト済', bg: BLUE_BG, fg: BLUE_DK, dot: BLUE }
            : isSent
                ? { text: 'お見積り', bg: BLUE_BG, fg: BLUE_DK, dot: BLUE }
                : { text: isWriting ? 'お見積り作成中' : '受付完了', bg: '#FEF6E7', fg: '#B45309', dot: '#F59E0B' };
    const heroChips = [`🗓 ${periodLabel}`, estimate.people ? `👤 ${estimate.people}` : '', `🚐 ${estimate.vehicle || '専用車'}`].filter(Boolean) as string[];
    const heroSubtitle = '大切なご旅行のために、心を込めてご用意したお見積りです。';

    const infoItems = [
        { label: 'ご旅行者名', value: `${estimate.contact?.name || '—'} 様` },
        { label: 'ご旅行期間', value: periodLabel },
        { label: 'ご人数', value: String(estimate.people || '—') },
        { label: 'ガイド', value: '日本語ガイド' },
        { label: '車両', value: estimate.vehicle || '専用車' },
    ];

    const yen = (n: number) => `¥${(n || 0).toLocaleString()}`;
    const sectionPad = m ? '20px 18px' : '38px 56px';
    const btnBase: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '15px 0', borderRadius: 14, fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer', textDecoration: 'none' };

    // ─── 진행 단계 ───
    const stepsBlock = (
        <div style={{ padding: m ? '18px 18px' : '24px 56px', borderTop: m ? `8px solid ${SECTION}` : `1px solid #EDEFF2` }}>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', maxWidth: 340, margin: '0 auto' }}>
                <div style={{ position: 'absolute', top: 11, left: 12, right: 12, height: 2, background: HAIRLINE }} />
                <div style={{ position: 'absolute', top: 11, left: 12, height: 2, background: BLUE, width: isSent ? 'calc(100% - 24px)' : isWriting ? '50%' : '0%', transition: 'width .4s' }} />
                {stepLabels.map((label, i) => (
                    <div key={label} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: stepDone[i] ? BLUE : '#E2E8F0', border: '4px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,.1)', color: '#fff', fontSize: 11, fontWeight: 900 }}>
                            {stepDone[i] ? '✓' : ''}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: stepDone[i] ? BLUE_DK : FAINT }}>{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    // ─── 예약 전환 완료 배너 ───
    const convertedBanner = isConverted ? (
        <div style={{ padding: m ? '16px 18px 0' : '24px 56px 0' }}>
            <div style={{ background: INK, borderRadius: 16, padding: m ? 18 : '24px 28px', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <span style={{ width: 44, height: 44, flex: 'none', borderRadius: 13, background: 'rgba(255,255,255,.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎉</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: m ? 15 : 17, fontWeight: 800 }}>ご予約を承りました！</div>
                        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.7)', marginTop: 3 }}>ご予約金のご入金後に最終確定となります。最新の確定日程表はマイページでご確認ください。</div>
                    </div>
                </div>
                <button onClick={() => navigate('/mypage/reservations')} style={{ ...btnBase, marginTop: 14, background: '#fff', color: INK }}>
                    マイ予約で確認する →
                </button>
            </div>
        </div>
    ) : null;

    // ─── 요금 카드 ───
    const total = Number(estimate.confirmedPrice || 0);
    const deposit = Number(estimate.deposit || 0);
    const priceBlock = (total > 0) ? (
        <div style={{ padding: sectionPad, borderTop: m ? `8px solid ${SECTION}` : `1px solid #EDEFF2` }}>
            <div style={eyebrowStyle(BLUE, m)}>PRICE</div>
            <h2 style={h2Style(m)}>お見積り金額</h2>
            <div style={{ marginTop: m ? 14 : 20, background: SECTION, borderRadius: 16, padding: m ? 16 : '22px 26px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 13, color: MUTE, fontWeight: 700 }}>総額</span>
                    <span style={{ fontSize: m ? 24 : 30, fontWeight: 900, color: INK, letterSpacing: '-0.02em' }}>{yen(total)}</span>
                </div>
                <div style={{ height: 1, background: BORDER, margin: m ? '12px 0' : '16px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12.5, color: MUTE }}>ご予約金（銀行振込）</span>
                    <span style={{ fontSize: m ? 15 : 17, fontWeight: 800, color: BLUE_DK }}>{yen(deposit)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
                    <span style={{ fontSize: 12.5, color: MUTE }}>残金（現地にて現金・日本円）</span>
                    <span style={{ fontSize: m ? 15 : 17, fontWeight: 800, color: INK }}>{yen(total - deposit)}</span>
                </div>
            </div>
        </div>
    ) : isSent ? (
        <div style={{ padding: sectionPad, borderTop: m ? `8px solid ${SECTION}` : `1px solid #EDEFF2` }}>
            <div style={{ background: '#FEF6E7', borderRadius: 16, padding: m ? 16 : '20px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#B45309' }}>ご相談の上、金額が確定次第ご予約可能となります。</div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: '#C0842A', marginTop: 4 }}>担当者が金額を確定するとご予約ボタンが有効になります。</div>
            </div>
        </div>
    ) : null;

    // ─── CTA ───
    const requested = estimate.adminStatus === 'reservation_requested' || estimate.adminStatus === 'converted';
    const ctaBlock = (isSent && !isConverted) ? (
        <div style={{ padding: m ? '0 18px 4px' : '0 56px 8px', display: 'flex', flexDirection: 'column', gap: 10, marginTop: m ? 16 : 20 }}>
            {estimate.estimateUrl && (
                <a href={estimate.estimateUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnBase, background: '#fff', color: INK, border: `1px solid ${BORDER}` }}>
                    📄 お見積書（添付）を確認
                </a>
            )}
            {estimate.status === 'answered' ? (
                (total > 0) ? (
                    <button onClick={handleConfirmReservation} style={{ ...btnBase, background: BLUE, color: '#fff', boxShadow: '0 10px 24px rgba(26,140,255,.35)' }}>
                        この内容で予約をリクエストする
                    </button>
                ) : null
            ) : (
                <button onClick={handleReservationRequest} disabled={requested}
                    style={{ ...btnBase, background: requested ? SECTION : BLUE, color: requested ? FAINT : '#fff', cursor: requested ? 'not-allowed' : 'pointer', boxShadow: requested ? 'none' : '0 10px 24px rgba(26,140,255,.35)' }}>
                    {estimate.adminStatus === 'reservation_requested' ? 'お申し込み完了' : '予約相談を申し込む'}
                </button>
            )}
        </div>
    ) : null;

    // ─── 담당자 메시지 ───
    const adminNoteBlock = estimate.adminNote ? (
        <div style={{ padding: m ? '18px 18px 0' : '28px 56px 0' }}>
            <div style={{ background: BLUE_BG, borderRadius: 16, padding: m ? 16 : '20px 24px' }}>
                <div style={{ fontSize: m ? 13 : 14, fontWeight: 800, color: BLUE_DK, marginBottom: 8 }}>💬 担当者からのメッセージ</div>
                <div style={{ fontSize: m ? 12.5 : 13.5, color: '#24405E', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{estimate.adminNote}</div>
            </div>
        </div>
    ) : null;

    // ─── 작성 중 안내 ───
    const writingBlock = !isSent ? (
        <div style={{ padding: m ? '18px 18px 0' : '28px 56px 0' }}>
            <div style={{ background: SECTION, borderRadius: 16, padding: m ? 18 : '24px 28px', textAlign: 'center' }}>
                <div style={{ fontSize: m ? 13.5 : 15, fontWeight: 800, color: INK }}>担当者がお見積りを作成しています</div>
                <div style={{ fontSize: 12, color: SUB, marginTop: 5 }}>完成次第、メールでお知らせいたします。今しばらくお待ちください。</div>
            </div>
        </div>
    ) : null;

    // ─── ご依頼内容 ───
    const requestChips = [...(estimate.destinations || []), ...(estimate.themes || []), ...(estimate.accommodations || [])];
    const recapBlock = (
        <div style={{ padding: m ? '20px 18px 26px' : '36px 56px 44px', borderTop: m ? `8px solid ${SECTION}` : `1px solid #EDEFF2` }}>
            <div style={eyebrowStyle(MUTE, m)}>YOUR REQUEST</div>
            <h2 style={h2Style(m)}>ご依頼内容</h2>
            {requestChips.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: m ? 12 : 16 }}>
                    {requestChips.map((item: string, idx: number) => (
                        <span key={idx} style={{ fontSize: 12, fontWeight: 700, color: BLUE_DK, background: BLUE_BG, padding: '5px 12px', borderRadius: 999 }}>{item}</span>
                    ))}
                </div>
            )}
            <div style={{ marginTop: m ? 14 : 18 }}>
                {[
                    { label: 'ご希望予算（お一人）', value: estimate.priceRange || '—' },
                    { label: 'お名前', value: estimate.contact?.name || '—' },
                    { label: 'お電話', value: estimate.contact?.phone || '—' },
                    { label: 'メール', value: estimate.contact?.email || '—' },
                    { label: 'ご依頼日', value: estimate.requestDate || '—' },
                ].map((r, i, arr) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, padding: '9px 0', borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${HAIRLINE}` }}>
                        <span style={{ fontSize: 13, color: MUTE, flex: 'none' }}>{r.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: INK, textAlign: 'right', wordBreak: 'break-all' }}>{r.value}</span>
                    </div>
                ))}
            </div>
            {estimate.additionalRequest && (
                <div style={{ marginTop: 12, background: SECTION, borderRadius: 14, padding: m ? 14 : '16px 20px', fontSize: 12.5, color: SUB, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{estimate.additionalRequest}</div>
            )}
            <div style={{ marginTop: m ? 22 : 28, textAlign: 'center' }}>
                <div style={{ fontSize: m ? 13 : 15, fontWeight: 800, letterSpacing: '0.04em', color: INK }}>MONGOLIA MILKY WAY</div>
                <div style={{ fontSize: m ? 9 : 12, color: FAINT, lineHeight: 1.6, marginTop: 10 }}>※ 本お見積りの内容・金額は、ご相談の上で変更となる場合がございます。｜お見積り番号 {quoteNumber}</div>
            </div>
        </div>
    );

    // ─── 일정표 ───
    const itineraryBlock = docDays.length > 0 ? (
        <div style={{ padding: m ? '22px 18px 8px' : '40px 56px 8px', borderTop: m ? `8px solid ${SECTION}` : `1px solid #EDEFF2` }}>
            {isConverted && (
                <div style={{ marginBottom: 14, background: SECTION, borderRadius: 12, padding: '10px 14px', fontSize: 12, color: SUB }}>
                    ※ こちらはお見積り時点の内容です。最新の確定日程表はマイページよりご確認ください。
                </div>
            )}
            <DayTimelineBlock days={docDays} m={m} startDate={estimate.confirmedStartDate ? String(estimate.confirmedStartDate).slice(0, 10) : undefined} />
        </div>
    ) : null;

    return (
        <>
            <SEO
                title="お見積もり"
                description="お客様専用のお見積もりページです。"
                robots="noindex, nofollow"
            />
            <div className="doc-page jp" style={{ minHeight: '100vh', background: PAGE_BG, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: m ? '0 0 110px' : '0 24px 110px', fontFamily: "'Noto Sans JP','Pretendard',sans-serif", boxSizing: 'border-box' }}>
                {/* 상단 바 (뒤로가기) */}
                <div style={{ position: 'sticky', top: 0, zIndex: 50, width: '100%', background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(6px)', borderBottom: `1px solid ${HAIRLINE}` }}>
                    <div style={{ maxWidth: m ? 430 : 1120, margin: '0 auto', display: 'flex', alignItems: 'center', padding: '12px 14px' }}>
                        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK, display: 'inline-flex', padding: 6 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back</span>
                        </button>
                        <span style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 800, color: INK, paddingRight: 34 }}>お見積り詳細</span>
                    </div>
                </div>

                <div style={{ width: '100%', maxWidth: m ? 430 : 1120, marginTop: m ? 12 : 32 }}>
                    <div className="doc-card" style={{ width: '100%', background: '#fff', borderRadius: m ? 4 : 8, boxShadow: m ? '0 1px 3px rgba(0,0,0,.08)' : '0 4px 24px rgba(26,27,30,.10)', overflow: 'hidden' }}>
                        {m ? <HeroMobile badge={heroBadge} title={estimate.title} subtitle={heroSubtitle} chips={heroChips} />
                            : <HeroPC badge={heroBadge} title={estimate.title} subtitle={heroSubtitle} chips={heroChips} />}
                        {convertedBanner}
                        {stepsBlock}
                        {writingBlock}
                        {adminNoteBlock}
                        {m ? (
                            <>
                                <InfoBlock items={infoItems} m={m} />
                                {priceBlock}
                                {ctaBlock}
                                {itineraryBlock}
                                {isSent && <IncludedListsBlock included={includedList} excluded={excludedList} m={m} />}
                                {recapBlock}
                            </>
                        ) : (
                            <>
                                <div style={{ height: 28 }} />
                                <InfoBlock items={infoItems} m={m} />
                                {priceBlock}
                                {ctaBlock}
                                {itineraryBlock}
                                {isSent && <IncludedListsBlock included={includedList} excluded={excludedList} m={m} />}
                                {recapBlock}
                            </>
                        )}
                    </div>
                </div>

                <BottomNav />
            </div>
        </>
    );
};
