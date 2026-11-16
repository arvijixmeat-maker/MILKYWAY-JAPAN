import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { SEO } from '../components/seo/SEO';
import { type DayData } from '../components/document/ItineraryDocParts';
import { GuideItineraryPrint } from '../components/document/GuideItineraryPrint';
import { TripDocument } from '../components/trip-doc/TripDocument';
import { TripDocLegal } from '../components/trip-doc/TripDocLegal';
import { buildTripDoc } from '../components/trip-doc/tripDocModel';
import { useTripSources, resolveTripImages, fallbackSpots } from '../components/trip-doc/tripDocSources';
import { C } from '../components/trip-doc/tripDocContent';

/**
 * 確定日程表（고객용）— 디자인 시안 「Japan version」(견적서와 같은 디자인, mode=confirmed).
 * 일정·사진은 관리자 문서 편집기에서 저장한 내용(관광지/호텔 마스터 사진 포함),
 * 숙소·식사 등 공통 섹션 사진도 관광지·호텔 마스터에서 자동으로 고른다 (tripDocSources).
 * ?guide=1 은 가이드용 인쇄본(GuideItineraryPrint)을 그대로 쓴다.
 */

interface ItineraryData {
    reservation: {
        id: string; reservationNumber: string | null; productName: string; customerName: string; travelers: number;
        startDate: string; endDate: string; status: string;
        totalPrice?: number | string | null; depositAmount?: number | string | null; balanceAmount?: number | string | null;
        depositStatus?: string | null; createdAt?: string | null; updatedAt?: string | null; paypalPayUrl?: string | null;
    };
    template: { id: string; name: string; description: string; days: any[]; documentSettings?: any } | null;
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

const Center: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: C.paper, fontFamily: "'Noto Sans JP','Pretendard',sans-serif" }}>{children}</div>
);

export const DocumentItinerary: React.FC = () => {
    const { reservationId } = useParams();
    const [searchParams] = useSearchParams();
    const guideMode = searchParams.get('guide') === '1';
    const [data, setData] = useState<ItineraryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { sources } = useTripSources();

    useEffect(() => {
        if (!reservationId) return;
        (async () => {
            try { setData(await api.documents.itinerary.get(reservationId)); }
            catch (e: any) { setError(e.message || '日程表を読み込めませんでした。'); }
            finally { setLoading(false); }
        })();
    }, [reservationId]);

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
        const doPrint = () => {
            if (printed) return;
            printed = true;
            const previousTitle = document.title;
            // Chromium 인쇄의 선택적 머리글에 긴 페이지 제목이 반복되지 않도록 비운다.
            if (guideMode) document.title = ' ';
            const closeAfterPrint = guideMode && searchParams.get('autoclose') === '1';
            const finishPrint = () => {
                document.title = previousTitle;
                if (closeAfterPrint) window.setTimeout(() => window.close(), 300);
            };
            try {
                window.addEventListener('afterprint', finishPrint, { once: true });
                window.focus();
                window.print();
                if (!closeAfterPrint) window.setTimeout(finishPrint, 10000);
            } catch {
                finishPrint();
            }
        };
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
    }, [searchParams, loading, error, data, guideMode]);

    const doc = useMemo(() => {
        if (!data) return null;
        const { reservation: r, template, guide, days } = data;
        return buildTripDoc({
            mode: 'confirmed',
            id: r.id,
            docNo: r.reservationNumber,
            issuedAt: r.updatedAt || r.createdAt,
            customerName: r.customerName,
            people: r.travelers,
            startDate: r.startDate,
            endDate: r.endDate,
            title: template?.name || r.productName,
            days,
            documentSettings: template?.documentSettings,
            included: data.productIncluded,
            excluded: data.productExcluded,
            total: r.totalPrice,
            deposit: r.depositAmount,
            balance: r.balanceAmount,
            depositPaid: r.depositStatus === 'paid',
            payUrl: r.paypalPayUrl,
            guideName: guide?.name,
            designSpots: fallbackSpots(sources),
        });
    }, [data, sources]);
    const images = useMemo(() => resolveTripImages(doc, sources), [doc, sources]);

    if (loading) {
        return (<>
            <SEO title="確定日程表" description="お客様専用の旅行日程表です。" robots="noindex, nofollow" />
            <Center><div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: C.line, borderTopColor: C.mint }} /></Center>
        </>);
    }
    if (error || !data || !doc) {
        return (<>
            <SEO title="確定日程表" description="お客様専用の旅行日程表です。" robots="noindex, nofollow" />
            <Center>
                <div style={{ maxWidth: 360, background: '#fff', borderRadius: 24, padding: 28, textAlign: 'center', boxShadow: '0 10px 30px rgba(18,59,58,.08)' }}>
                    <div style={{ fontSize: 40 }}>🗓</div>
                    <p style={{ marginTop: 10, fontSize: 17, fontWeight: 800, color: C.ink }}>日程表を表示できません</p>
                    <p style={{ marginTop: 4, fontSize: 13, color: C.sub }}>{error || 'URLをご確認ください。'}</p>
                </div>
            </Center>
        </>);
    }

    if (guideMode) {
        const title = data.template?.name || data.reservation.productName;
        return (
            <>
                <SEO title="ガイド用旅行日程" description="担当ガイド用の旅行日程表です。" robots="noindex, nofollow" />
                <GuideItineraryPrint reservation={data.reservation} title={title} days={data.days} extra={guideExtra} />
            </>
        );
    }

    const ds = data.template?.documentSettings || {};
    return (
        <>
            <SEO title="確定日程表" description="お客様専用の旅行日程表です。" robots="noindex, nofollow" />
            <style>{`@page { size: A4; margin: 10mm; }`}</style>
            <TripDocument
                doc={doc}
                images={images}
                printable
                legal={<TripDocLegal emergencyPhone={ds?.guide?.emergencyPhone || data.guide?.phone} note={ds?.detail?.note} />}
            />
        </>
    );
};
