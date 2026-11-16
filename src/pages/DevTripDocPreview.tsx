import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TripDocument } from '../components/trip-doc/TripDocument';
import { TripDocLegal } from '../components/trip-doc/TripDocLegal';
import { buildTripDoc, defaultQuoteDocSettings, yen } from '../components/trip-doc/tripDocModel';
import { resolveTripImages, fallbackSpots, type TripSources } from '../components/trip-doc/tripDocSources';
import { SAMPLE_DAYS, SAMPLE_SPOTS, SAMPLE_HOTELS, SAMPLE_DESIGN_SPOTS } from '../components/trip-doc/devSample';

const SAMPLE_SOURCES: TripSources = { spots: SAMPLE_SPOTS, hotels: SAMPLE_HOTELS, designSpots: SAMPLE_DESIGN_SPOTS };

/**
 * 개발용 미리보기 — 로컬(npm run dev)에서만 열리는 /dev/trip-doc.
 * API 없이도 볼 수 있도록 운영 사이트의 관광지·호텔 마스터를 옮긴 샘플로, 실제 화면과 같은 방식(resolveTripImages)으로 사진을 연결한다.
 * ?doc=quote (견적서) / ?doc=confirmed (확정일정표)
 */
export const DevTripDocPreview: React.FC = () => {
    const [params] = useSearchParams();
    const mode = params.get('doc') === 'confirmed' ? 'confirmed' : 'quote';

    const doc = useMemo(() => {
        const issued = new Date();
        const validUntil = new Date(issued.getFullYear(), issued.getMonth(), issued.getDate() + 7);
        const pad = (n: number) => String(n).padStart(2, '0');
        return buildTripDoc({
            mode,
            id: 'dev-preview-1129',
            docNo: mode === 'confirmed' ? 'MN261116-1129' : null,
            issuedAt: `${issued.getFullYear()}-${pad(issued.getMonth() + 1)}-${pad(issued.getDate())}`,
            customerName: '山田',
            people: 4,
            startDate: '2026-11-29',
            endDate: '2026-12-03',
            title: '冬のプライベートツアー',
            days: SAMPLE_DAYS,
            documentSettings: {
                overview: {
                    pricePerPerson: '90000',
                    includedText: ['全日程の宿泊', '全日程のお食事', '特別料理', '空港送迎', '全日程 専用車両', '日本語専門ガイド', '観光地・公演入場料', '1日1本 ミネラルウォーター', 'アクティビティ費用', 'プライベートツアー', '星空・天の川観賞'].join('\n'),
                    excludedText: ['往復航空券', '個人的な費用', 'オプション費用', '海外旅行保険', 'SIMカード代'].join('\n'),
                },
                quoteDoc: {
                    ...defaultQuoteDocSettings(),
                    coverLead: '冬旅', region: '中央モンゴル', manager: 'ボラ',
                    validUntil: `${validUntil.getFullYear()}-${pad(validUntil.getMonth() + 1)}-${pad(validUntil.getDate())}`,
                    planName: '冬のプライベートツアー', planSub: 'UBホテル1泊 + 高級ゲル2泊',
                    flightIn: '14:15', flightOut: '00:25', pickup: '11.29 14:15 · 12.02 夜',
                    stayLabel: 'UBホテル1泊 + 高級ゲル2泊', stayLine: 'UBホテル + 高級ゲル',
                    // 대표 여행지 — 관광지 마스터 샘플에서 사진 있는 곳 4개
                    spots: SAMPLE_SOURCES.spots.filter(s => s.region !== 'food' && (s.images?.length || 0) > 0).slice(0, 4).map(s => s.id),
                },
            },
            total: 360000,
            deposit: 20000,
            balance: mode === 'confirmed' ? 340000 : null,
            depositPaid: mode === 'confirmed',
            guideName: mode === 'confirmed' ? 'ボラ' : null,
            adminNote: null,
            designSpots: fallbackSpots(SAMPLE_SOURCES),
            spotMaster: SAMPLE_SOURCES.spots,
        });
    }, [mode]);
    const images = useMemo(() => resolveTripImages(doc, SAMPLE_SOURCES), [doc]);

    const switcher = (
        <div style={{ position: 'fixed', left: 12, bottom: 96, zIndex: 100, display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: 'rgba(18,59,58,0.9)', boxShadow: '0 6px 18px rgba(0,0,0,0.2)', fontFamily: 'Pretendard, sans-serif' }}>
            {([['quote', '견적서'], ['confirmed', '확정일정표']] as const).map(([m, label]) => (
                <Link key={m} to={`/dev/trip-doc?doc=${m}`} replace
                    style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, textDecoration: 'none', background: mode === m ? '#06C4A0' : 'transparent', color: mode === m ? '#123B3A' : '#FFFFFF' }}>
                    {label}
                </Link>
            ))}
        </div>
    );

    return (
        <>
            {switcher}
            <TripDocument
                key={mode}
                doc={doc}
                images={images}
                bar={mode === 'quote' ? { sub: `${doc.people}名様`, amount: yen(doc.price?.total || 0), amountLabel: '合計', label: 'この内容で確定する', onClick: () => window.alert('미리보기 — 실제 화면에서는 결제(예약) 페이지로 이동합니다.') } : null}
                printable={mode === 'confirmed'}
                legal={mode === 'confirmed' ? <TripDocLegal /> : undefined}
            />
        </>
    );
};
