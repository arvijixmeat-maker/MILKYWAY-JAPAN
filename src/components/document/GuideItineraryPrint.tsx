import React from 'react';
import { dayDate, formatRange, type DayData } from './ItineraryDocParts';

interface GuidePrintExtra {
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

interface GuideItineraryPrintProps {
    reservation: {
        reservationNumber?: string | null;
        productName: string;
        customerName: string;
        travelers: number;
        startDate: string;
        endDate: string;
    };
    title: string;
    days: DayData[];
    extra: GuidePrintExtra | null;
}

const clean = (value?: string) => {
    const text = String(value || '').trim();
    return text && text !== '미입력' ? text : '—';
};

const mealLabels: Array<{ key: 'breakfast' | 'lunch' | 'dinner'; label: string }> = [
    { key: 'breakfast', label: '朝食' },
    { key: 'lunch', label: '昼食' },
    { key: 'dinner', label: '夕食' },
];

export const GuideItineraryPrint: React.FC<GuideItineraryPrintProps> = ({ reservation, title, days, extra }) => {
    const customerName = extra?.customerName || reservation.customerName;
    const people = extra?.people || (reservation.travelers ? `${reservation.travelers}名` : '—');
    const guide = [extra?.guideName, extra?.guidePhone].filter(Boolean).join(' · ');
    const vehicle = [extra?.vehicleType, extra?.vehiclePhone].filter(Boolean).join(' · ');
    const infoRows = [
        ['お客様名', customerName ? `${customerName} 様` : '—'],
        ['ご旅行人数', people],
        ['旅行期間', formatRange(reservation.startDate, reservation.endDate)],
        ['モンゴル到着', clean(extra?.arrival)],
        ['モンゴル出発・帰国', clean(extra?.departure)],
        ['担当ガイド', clean(guide)],
        ['車両', clean(vehicle)],
    ];

    return (
        <div className="guide-print-page">
            <style>{`
                * { box-sizing: border-box; }
                body { margin: 0; background: #fff !important; }
                .guide-print-page {
                    width: 100%; max-width: 920px; margin: 0 auto; padding: 30px 34px 36px;
                    color: #17202b; background: #fff;
                    font-family: 'Noto Sans JP', 'Pretendard', 'Malgun Gothic', Arial, sans-serif;
                    -webkit-print-color-adjust: exact; print-color-adjust: exact;
                }
                .guide-brand { display:flex; align-items:center; justify-content:space-between; gap:20px; }
                .guide-brand-name { display:flex; align-items:center; gap:10px; font-size:19px; font-weight:900; letter-spacing:-.02em; }
                .guide-brand-mark { width:29px; height:29px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; color:#fff; background:#08ad8e; font-size:17px; }
                .guide-brand-name b { color:#08ad8e; }
                .guide-doc-label { text-align:right; font-size:11px; color:#7d8794; letter-spacing:.12em; }
                .guide-doc-label strong { display:block; color:#17202b; font-size:19px; letter-spacing:.04em; }
                .guide-hero { margin-top:22px; padding:22px 24px; border:1px solid #cbece5; border-radius:18px; background:linear-gradient(135deg,#effbf8,#f2f7ff); }
                .guide-kicker { color:#00a889; font-size:11px; font-weight:800; letter-spacing:.18em; }
                .guide-title { margin:8px 0 0; font-size:24px; line-height:1.35; letter-spacing:-.03em; }
                .guide-number { margin-top:8px; font-size:11px; color:#7d8794; }
                .guide-info { margin-top:16px; display:grid; grid-template-columns:1fr 1fr; border:1px solid #e1e6eb; border-radius:14px; overflow:hidden; }
                .guide-info-row { min-height:45px; display:grid; grid-template-columns:118px 1fr; align-items:center; gap:12px; padding:9px 13px; border-bottom:1px solid #e8ecf0; }
                .guide-info-row:nth-child(odd) { border-right:1px solid #e8ecf0; }
                .guide-info-row:last-child { grid-column:1 / -1; border-right:0; border-bottom:0; }
                .guide-info-label { font-size:11px; font-weight:700; color:#788391; }
                .guide-info-value { font-size:12.5px; font-weight:700; line-height:1.5; word-break:break-word; }
                .guide-memos { margin-top:13px; padding:13px 16px; border:1px solid #f0dfb4; border-radius:12px; background:#fffaf0; break-inside:avoid; page-break-inside:avoid; }
                .guide-memos-title { font-size:11.5px; font-weight:800; color:#a46100; }
                .guide-memos ul { margin:7px 0 0; padding-left:18px; }
                .guide-memos li { margin:3px 0; font-size:11.5px; line-height:1.55; white-space:pre-wrap; }
                .guide-section-head { margin:26px 0 12px; display:flex; align-items:end; justify-content:space-between; gap:12px; break-after:avoid; page-break-after:avoid; }
                .guide-section-head small { display:block; color:#00a889; font-size:10.5px; font-weight:800; letter-spacing:.17em; }
                .guide-section-head h2 { margin:3px 0 0; font-size:22px; }
                .guide-section-head span { font-size:11px; color:#8a94a1; }
                .guide-day { margin:0 0 13px; border:1px solid #dbe1e7; border-radius:13px; overflow:hidden; break-inside:auto; page-break-inside:auto; }
                .guide-day-head { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:11px; padding:10px 13px; background:#f2f4f6; border-bottom:1px solid #dbe1e7; break-after:avoid; page-break-after:avoid; }
                .guide-day-badge { padding:5px 9px; border-radius:7px; color:#fff; background:#00a889; font-size:11.5px; font-weight:900; white-space:nowrap; }
                .guide-day-title { min-width:0; font-size:13.5px; font-weight:800; line-height:1.35; }
                .guide-day-date { font-size:10.5px; font-weight:700; color:#8b95a2; white-space:nowrap; }
                .guide-activity { display:grid; grid-template-columns:64px 105px 1fr; gap:10px; align-items:start; padding:8px 13px; border-bottom:1px dashed #e1e6eb; break-inside:avoid; page-break-inside:avoid; }
                .guide-activity:last-child { border-bottom:0; }
                .guide-time { width:max-content; min-width:46px; text-align:center; padding:3px 7px; border-radius:7px; background:#e8f2ff; color:#2776c8; font-size:10.5px; font-weight:800; }
                .guide-place { color:#8994a1; font-size:10.5px; font-weight:700; line-height:1.45; }
                .guide-action { font-size:12.5px; font-weight:750; line-height:1.45; }
                .guide-description { margin-top:2px; color:#87919e; font-size:10.5px; font-weight:400; line-height:1.45; }
                .guide-day-foot { display:flex; flex-wrap:wrap; gap:6px; padding:9px 13px; background:#fbfcfd; break-inside:avoid; page-break-inside:avoid; }
                .guide-chip { padding:4px 8px; border-radius:7px; background:#e8f8f4; color:#008d75; font-size:10.5px; font-weight:750; }
                .guide-chip.stay { margin-left:auto; color:#fff; background:#00ad91; }
                .guide-empty { padding:10px 13px; color:#9aa3ad; font-size:11.5px; }
                .guide-footer { margin-top:20px; padding-top:12px; border-top:1px solid #e3e7eb; text-align:center; color:#8a94a1; font-size:9.5px; line-height:1.6; }
                .guide-footer b { color:#00a889; }
                @page { size:A4; margin:10mm; }
                @media print {
                    .guide-print-page { max-width:none; padding:0; }
                    .guide-day { box-shadow:none; }
                }
            `}</style>

            <header className="guide-brand">
                <div className="guide-brand-name"><span className="guide-brand-mark">★</span><span>MILKYWAY <b>TRAVEL</b></span></div>
                <div className="guide-doc-label"><strong>GUIDE ITINERARY</strong>ガイド用旅行日程</div>
            </header>

            <section className="guide-hero">
                <div className="guide-kicker">MILKYWAY · MONGOLIA</div>
                <h1 className="guide-title">{title || reservation.productName}</h1>
                <div className="guide-number">予約番号 {reservation.reservationNumber || '—'}</div>
            </section>

            <section className="guide-info">
                {infoRows.map(([label, value]) => (
                    <div className="guide-info-row" key={label}>
                        <span className="guide-info-label">{label}</span>
                        <span className="guide-info-value">{value}</span>
                    </div>
                ))}
            </section>

            {!!extra?.memos?.length && (
                <section className="guide-memos">
                    <div className="guide-memos-title">重要なご要望・メモ</div>
                    <ul>{extra.memos.map((memo, index) => <li key={index}>{memo}</li>)}</ul>
                </section>
            )}

            <div className="guide-section-head">
                <div><small>TOUR ITINERARY · 全{days.length}日</small><h2>旅行日程</h2></div>
                <span>画像を省いたガイド用一覧</span>
            </div>

            <main>
                {days.length === 0 && <div className="guide-empty">日程は現在準備中です。</div>}
                {days.map((day, index) => {
                    const dayNumber = day.day || index + 1;
                    const activities = day.activities || [];
                    const meals = mealLabels
                        .map(({ key, label }) => ({ label, value: day.meals?.[key] }))
                        .filter((meal) => meal.value);
                    return (
                        <section className="guide-day" key={`${dayNumber}-${index}`}>
                            <div className="guide-day-head">
                                <span className="guide-day-badge">{dayNumber}日目</span>
                                <span className="guide-day-title">{day.title || `${dayNumber}日目`}{day.region ? ` · ${day.region}` : ''}</span>
                                <span className="guide-day-date">{dayDate(reservation.startDate, dayNumber)}</span>
                            </div>
                            {activities.length === 0
                                ? <div className="guide-empty">調整中</div>
                                : activities.map((activity, activityIndex) => (
                                    <div className="guide-activity" key={activityIndex}>
                                        <span className="guide-time">{activity.time || '—'}</span>
                                        <span className="guide-place">{activity.type || day.region || '日程'}</span>
                                        <div className="guide-action">
                                            {activity.title}
                                            {activity.description && <div className="guide-description">{activity.description}</div>}
                                        </div>
                                    </div>
                                ))}
                            {(meals.length > 0 || day.accommodation?.name) && (
                                <div className="guide-day-foot">
                                    {meals.map((meal) => <span className="guide-chip" key={meal.label}>{meal.label} · {meal.value}</span>)}
                                    {day.accommodation?.name && <span className="guide-chip stay">宿泊 · {day.accommodation.name}</span>}
                                </div>
                            )}
                        </section>
                    );
                })}
            </main>

            <footer className="guide-footer"><b>MILKYWAY TRAVEL</b> · ガイド業務用資料<br />本日程は現地の天候・交通状況により変更となる場合があります。</footer>
        </div>
    );
};
