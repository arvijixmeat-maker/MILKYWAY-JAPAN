import React from 'react';
import { computeDuration, formatRange, type DayData } from './ItineraryDocParts';

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
    return text && text !== '미입력' && text !== 'undefined' ? text : '—';
};

const dateParts = (value?: string) => {
    const match = String(value || '').match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    if (!match) return null;
    return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
};

const compactDateRange = (start?: string, end?: string) => {
    const s = dateParts(start);
    const e = dateParts(end);
    if (!s || !e) return formatRange(start, end);
    return s.year === e.year
        ? `${s.year}/${s.month}/${s.day}〜${e.month}/${e.day}`
        : `${s.year}/${s.month}/${s.day}〜${e.year}/${e.month}/${e.day}`;
};

const longDayDate = (start?: string, dayNumber = 1) => {
    const parts = dateParts(start);
    if (!parts) return '';
    const date = new Date(parts.year, parts.month - 1, parts.day + dayNumber - 1);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

const todayLabel = () => {
    const now = new Date();
    return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
};

const asTextList = (value?: string[] | string) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value || '').split(/\r?\n|、|,/).map((item) => item.trim()).filter(Boolean);
};

const timeTone = (value?: string) => {
    const text = String(value || '').trim();
    if (/早朝|朝/.test(text)) return 'morning';
    if (/午前/.test(text)) return 'forenoon';
    if (/昼/.test(text)) return 'noon';
    if (/午後/.test(text)) return 'afternoon';
    if (/夕方|夕/.test(text)) return 'evening';
    if (/夜/.test(text)) return 'night';
    const hour = Number(text.match(/^(\d{1,2})[:時]/)?.[1]);
    if (Number.isFinite(hour)) {
        if (hour < 9) return 'morning';
        if (hour < 12) return 'forenoon';
        if (hour < 14) return 'noon';
        if (hour < 17) return 'afternoon';
        if (hour < 19) return 'evening';
        return 'night';
    }
    return 'neutral';
};

export const GuideItineraryPrint: React.FC<GuideItineraryPrintProps> = ({ reservation, title, days, extra }) => {
    const customerName = extra?.customerName || reservation.customerName;
    const people = extra?.people || (reservation.travelers ? `${reservation.travelers}名` : '—');
    const guide = [extra?.guideName, extra?.guidePhone].filter(Boolean).join(' · ');
    const vehicle = [extra?.vehicleType, extra?.vehiclePhone].filter(Boolean).join(' · ');
    const duration = computeDuration(reservation.startDate, reservation.endDate);
    const durationLabel = duration ? `${duration.nights}泊${duration.days}日` : `全${days.length}日`;
    const regions = Array.from(new Set(days.map((day) => day.region).filter(Boolean)))
        .slice(0, 4).join(' · ');

    const customerRows = [
        ['ご予約者', customerName ? `${customerName} 様` : '—'],
        ['ご旅行人数', people],
        ['ご旅行期間', formatRange(reservation.startDate, reservation.endDate)],
    ];
    const operationRows = [
        ['モンゴル到着', clean(extra?.arrival)],
        ['モンゴル出発・帰国', clean(extra?.departure)],
        ['担当ガイド', clean(guide)],
        ['車両', clean(vehicle)],
    ];

    return (
        <div className="guide-print-page">
            <style>{`
                * { box-sizing: border-box; }
                html, body { margin: 0; background: #fff !important; }
                .guide-print-page {
                    width: 100%; max-width: 920px; margin: 0 auto; padding: 28px 32px 34px;
                    color: #17202b; background: #fff;
                    font-family: 'Noto Sans JP', 'Pretendard', 'Malgun Gothic', Arial, sans-serif;
                    -webkit-print-color-adjust: exact; print-color-adjust: exact;
                }
                .guide-cover { break-after: page; page-break-after: always; }
                .guide-brand { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
                .guide-brand-left { min-width: 0; }
                .guide-brand-name { display: flex; align-items: center; gap: 9px; font-size: 18px; font-weight: 900; letter-spacing: -.025em; }
                .guide-brand-mark { width: 30px; height: 30px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; color: #fff; background: #0bb99c; font-size: 16px; }
                .guide-brand-name b { color: #08b99a; }
                .guide-brand-sub { margin-top: 5px; color: #8a96a3; font-size: 10.5px; font-weight: 600; }
                .guide-doc-label { text-align: right; color: #8b96a2; font-size: 10.5px; font-weight: 700; }
                .guide-doc-label strong { display: block; color: #18202c; font-size: 22px; letter-spacing: .08em; line-height: 1.05; }
                .guide-doc-meta { margin-top: 13px; display: grid; grid-template-columns: auto auto; gap: 4px 12px; justify-content: end; font-size: 10.5px; }
                .guide-doc-meta span:nth-child(odd) { color: #929ca8; text-align: right; }
                .guide-doc-meta span:nth-child(even) { color: #18202c; font-weight: 800; }
                .guide-hero { position: relative; overflow: hidden; margin-top: 21px; padding: 20px 24px; border-radius: 18px; background: linear-gradient(115deg,#e5fbf6,#edf6ff); }
                .guide-hero::after { content: ''; position: absolute; inset: 0; opacity: .55; background-image: radial-gradient(circle,#2bcdb0 1px,transparent 1.5px),radial-gradient(circle,#8fc8ff 1px,transparent 1.5px); background-size: 144px 84px,188px 104px; background-position: 48px 22px,120px 48px; pointer-events: none; }
                .guide-hero > * { position: relative; z-index: 1; }
                .guide-kicker { color: #009f86; font-size: 10.5px; font-weight: 900; letter-spacing: .2em; }
                .guide-title { margin: 8px 0 0; font-size: 24px; line-height: 1.3; letter-spacing: -.035em; }
                .guide-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 15px; }
                .guide-chip { max-width: 100%; padding: 6px 12px; border: 1px solid #bde9e1; border-radius: 999px; color: #3e4b58; background: rgba(255,255,255,.8); font-size: 10.5px; font-weight: 800; line-height: 1.25; }
                .guide-chip b { color: #009e85; }
                .guide-info-grid { display: grid; grid-template-columns: .92fr 1.28fr; gap: 12px; margin-top: 13px; }
                .guide-info-card { padding: 15px 17px 14px; border-radius: 16px; background: #f1f3f5; break-inside: avoid; page-break-inside: avoid; }
                .guide-info-title { margin-bottom: 9px; color: #009e85; font-size: 11.5px; font-weight: 900; }
                .guide-info-row { display: grid; grid-template-columns: 116px minmax(0,1fr); gap: 12px; padding: 4px 0; align-items: start; }
                .guide-info-row span:first-child { color: #8d97a3; font-size: 10.5px; }
                .guide-info-row span:last-child { color: #1b2330; font-size: 11px; font-weight: 800; line-height: 1.55; text-align: right; overflow-wrap: anywhere; white-space: pre-wrap; }
                .guide-memos { margin-top: 13px; padding: 13px 16px; border: 1px solid #f2d39f; border-radius: 14px; background: #fff8ec; break-inside: avoid; page-break-inside: avoid; }
                .guide-memos-title { color: #b56c08; font-size: 11.5px; font-weight: 900; }
                .guide-memos ul { margin: 7px 0 0; padding-left: 17px; }
                .guide-memos li { margin: 3px 0; color: #5e5549; font-size: 10.5px; line-height: 1.55; white-space: pre-wrap; }
                .guide-itinerary-section { padding-top: 2px; }
                .guide-section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin: 0 0 14px; break-after: avoid; page-break-after: avoid; }
                .guide-section-kicker { color: #009e85; font-size: 10.5px; font-weight: 900; letter-spacing: .18em; }
                .guide-section-head h2 { margin: 4px 0 0; font-size: 23px; letter-spacing: -.03em; }
                .guide-section-note { display: flex; align-items: center; gap: 7px; color: #8b96a2; font-size: 9.5px; }
                .guide-section-note::before { content: ''; width: 24px; border-top: 2px solid #17c4a6; }
                .guide-day-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; align-items: start; }
                .guide-day-card { overflow: hidden; border: 1px solid #cfe6df; border-radius: 13px; background: #fbfefd; break-inside: avoid; page-break-inside: avoid; }
                .guide-day-head { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px; align-items: center; min-height: 38px; padding: 9px 13px; color: #fff; background: #0cc3a2; }
                .guide-day-title { min-width: 0; font-size: 12.5px; font-weight: 900; line-height: 1.35; }
                .guide-day-title b { margin-right: 8px; }
                .guide-day-summary { max-width: 120px; font-size: 9px; font-weight: 800; line-height: 1.3; text-align: right; }
                .guide-day-date { padding: 6px 13px 0; color: #87949f; font-size: 9px; font-weight: 800; text-align: right; }
                .guide-activities { position: relative; padding: 5px 12px 5px 43px; }
                .guide-activities::before { content: ''; position: absolute; left: 20px; top: 13px; bottom: 13px; border-left: 2px solid #19c4a6; }
                .guide-activity { position: relative; min-height: 25px; padding: 4px 0; break-inside: avoid; page-break-inside: avoid; }
                .guide-activity::before { content: ''; position: absolute; left: -27px; top: 9px; width: 10px; height: 10px; border-radius: 50%; background: #15bea1; box-shadow: 0 0 0 2px #fbfefd; }
                .guide-activity-main { display: grid; grid-template-columns: auto minmax(0,1fr); gap: 7px; align-items: start; }
                .guide-time { min-width: 37px; padding: 2px 5px; border-radius: 6px; color: #2778c9; background: #e5f1ff; font-size: 8.5px; font-weight: 900; line-height: 1.35; text-align: center; }
                .guide-time.morning { color: #008e79; background: #dcf5ef; }
                .guide-time.forenoon { color: #d48808; background: #fff0cf; }
                .guide-time.noon { color: #d45c42; background: #ffe2da; }
                .guide-time.afternoon { color: #317bca; background: #e1efff; }
                .guide-time.evening { color: #d16b17; background: #ffead7; }
                .guide-time.night { color: #6d4bc0; background: #ebe2ff; }
                .guide-time.neutral { color: #687481; background: #edf0f3; }
                .guide-activity-copy { min-width: 0; }
                .guide-place { color: #8a96a1; font-size: 8.5px; font-weight: 800; line-height: 1.35; }
                .guide-action { color: #293542; font-size: 10.5px; font-weight: 700; line-height: 1.45; overflow-wrap: anywhere; }
                .guide-description { margin-top: 2px; color: #8a96a1; font-size: 8.5px; font-weight: 500; line-height: 1.45; white-space: pre-wrap; }
                .guide-empty { padding: 14px; color: #98a2ac; font-size: 10.5px; }
                .guide-day-details { padding: 7px 13px 10px; border-top: 1px dashed #d9e5e1; }
                .guide-stay { color: #0b4050; font-size: 9px; font-weight: 800; line-height: 1.5; overflow-wrap: anywhere; }
                .guide-meals { margin-top: 3px; color: #8a96a1; font-size: 8.5px; font-weight: 600; line-height: 1.45; }
                .guide-footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #e2e8e6; color: #8c98a3; font-size: 9px; line-height: 1.6; text-align: center; }
                .guide-footer b { color: #009e85; }
                @page { size: A4; margin: 10mm; }
                @media print {
                    .guide-print-page { max-width: none; padding: 0; }
                    .guide-day-card { box-shadow: none; }
                }
                @media screen and (max-width: 620px) {
                    .guide-day-grid, .guide-info-grid { grid-template-columns: 1fr; }
                }
            `}</style>

            <section className="guide-cover">
                <header className="guide-brand">
                    <div className="guide-brand-left">
                        <div className="guide-brand-name"><span className="guide-brand-mark">★</span><span>MILKYWAY <b>TRAVEL</b></span></div>
                        <div className="guide-brand-sub">モンゴル星空（天の川）旅行専門 · mongolryokou.com</div>
                    </div>
                    <div className="guide-doc-label">
                        <strong>GUIDE SHEET</strong>
                        ガイド用日程表
                        <div className="guide-doc-meta">
                            <span>予約番号</span><span>{reservation.reservationNumber || '—'}</span>
                            <span>発行日</span><span>{todayLabel()}</span>
                            <span>全日程</span><span>{durationLabel}</span>
                        </div>
                    </div>
                </header>

                <section className="guide-hero">
                    <div className="guide-kicker">MILKY WAY · MONGOLIA</div>
                    <h1 className="guide-title">{title || reservation.productName}</h1>
                    <div className="guide-chips">
                        <span className="guide-chip"><b>日程</b>　{durationLabel}</span>
                        <span className="guide-chip">（{compactDateRange(reservation.startDate, reservation.endDate)}）</span>
                        <span className="guide-chip"><b>人数</b>　{people}</span>
                        {regions && <span className="guide-chip"><b>ルート</b>　{regions}</span>}
                    </div>
                </section>

                <section className="guide-info-grid">
                    <div className="guide-info-card">
                        <div className="guide-info-title">お客様情報</div>
                        {customerRows.map(([label, value]) => (
                            <div className="guide-info-row" key={label}><span>{label}</span><span>{value}</span></div>
                        ))}
                    </div>
                    <div className="guide-info-card">
                        <div className="guide-info-title">現地手配情報</div>
                        {operationRows.map(([label, value]) => (
                            <div className="guide-info-row" key={label}><span>{label}</span><span>{value}</span></div>
                        ))}
                    </div>
                </section>

                {!!extra?.memos?.length && (
                    <section className="guide-memos">
                        <div className="guide-memos-title">重要なご要望・業務メモ</div>
                        <ul>{extra.memos.map((memo, index) => <li key={index}>{memo}</li>)}</ul>
                    </section>
                )}
            </section>

            <section className="guide-itinerary-section">
                <div className="guide-section-head">
                    <div><div className="guide-section-kicker">ITINERARY · {durationLabel}</div><h2>旅行日程</h2></div>
                    <div className="guide-section-note">予約の確定日程表から自動作成</div>
                </div>

                {days.length === 0
                    ? <div className="guide-empty">日程は現在準備中です。</div>
                    : <main className="guide-day-grid">
                        {days.map((day, index) => {
                            const dayNumber = day.day || index + 1;
                            const activities = day.activities || [];
                            const facilities = asTextList(day.accommodation?.facilities);
                            const stayParts = [day.accommodation?.name, day.accommodation?.type, ...facilities].filter(Boolean);
                            const meals = [
                                day.meals?.breakfast ? `朝食 ${day.meals.breakfast}` : '',
                                day.meals?.lunch ? `昼食 ${day.meals.lunch}` : '',
                                day.meals?.dinner ? `夕食 ${day.meals.dinner}` : '',
                            ].filter(Boolean);
                            return (
                                <article className="guide-day-card" key={`${dayNumber}-${index}`}>
                                    <div className="guide-day-head">
                                        <div className="guide-day-title"><b>{dayNumber}日目</b>{day.title || day.region || ''}</div>
                                        <div className="guide-day-summary">{day.summary || day.region || longDayDate(reservation.startDate, dayNumber)}</div>
                                    </div>
                                    <div className="guide-day-date">{longDayDate(reservation.startDate, dayNumber)}</div>
                                    {activities.length === 0
                                        ? <div className="guide-empty">調整中</div>
                                        : <div className="guide-activities">
                                            {activities.map((activity, activityIndex) => (
                                                <div className="guide-activity" key={activityIndex}>
                                                    <div className="guide-activity-main">
                                                        {activity.time && <span className={`guide-time ${timeTone(activity.time)}`}>{activity.time}</span>}
                                                        <div className="guide-activity-copy">
                                                            {activity.type && <div className="guide-place">{activity.type}</div>}
                                                            <div className="guide-action">{activity.title}</div>
                                                            {activity.description && <div className="guide-description">{activity.description}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>}
                                    {(stayParts.length > 0 || meals.length > 0) && (
                                        <div className="guide-day-details">
                                            {stayParts.length > 0 && <div className="guide-stay">宿泊　{stayParts.join(' · ')}</div>}
                                            {meals.length > 0 && <div className="guide-meals">食事　{meals.join(' · ')}</div>}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </main>}
            </section>

            <footer className="guide-footer"><b>MILKYWAY TRAVEL</b> · ガイド業務用資料<br />本日程は現地の天候・交通状況により変更となる場合があります。</footer>
        </div>
    );
};
