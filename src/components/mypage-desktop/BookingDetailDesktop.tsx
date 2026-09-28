import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { GuideDetailModal, AccommodationDetailModal } from '../common/DetailModals';
import { toTourDateKey } from '../../utils/formatDate';
import {
    STATUS_MAP, computeDays, formatDateShort, formatDateTime, parseArr, parseImage,
    type Accommodation, type PriceBreakdown, type ReservationDetail,
} from '../../utils/reservationDetail';
import { MW, MW_FONT_EN, MW_STICKY_TOP, isUsableImage, yen } from '../desktop-primitives/mwTokens';
import { Ico } from './myPageUi';
import { HAIR, ICON, PAPER, TONE, hover, mintBtn, mintHover, reservationTone } from './myPageTheme';
import { daysUntil } from './useMyPageData';

const HISTORY_ICON: Record<string, string> = {
    status_change: ICON.check,
    modification: ICON.quoteRequest,
    document_added: ICON.quotes,
    email: ICON.mail,
    admin_memo: ICON.chat,
    created: ICON.bookings,
    review_submitted: ICON.reviews,
};

/** The list API parses price_breakdown, but the raw `priceBreakdown` column is a JSON string. */
const readBreakdown = (r: ReservationDetail): PriceBreakdown | null => {
    for (const v of [r.price_breakdown, r.priceBreakdown as unknown]) {
        let o: unknown = v;
        if (typeof v === 'string') {
            try { o = JSON.parse(v); } catch { o = null; }
        }
        if (o && typeof o === 'object') {
            const b = o as Partial<PriceBreakdown>;
            return { total: Number(b.total) || 0, deposit: Number(b.deposit) || 0, local: Number(b.local) || 0 };
        }
    }
    return null;
};

const h3: CSSProperties = { margin: 0, fontSize: 18, fontWeight: 900 };
const tile: CSSProperties = { display: 'flex', alignItems: 'center', gap: 14, padding: 16, border: `1px solid ${MW.line}`, borderRadius: 18, background: '#fff', color: MW.navy, textDecoration: 'none' };
const tileHover = hover({ borderColor: MW.mint }, { borderColor: MW.line });

export function BookingDetailDesktop() {
    const navigate = useNavigate();
    const { id = '' } = useParams();
    const [showAllHistory, setShowAllHistory] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);
    const [accModal, setAccModal] = useState<{ accommodation: Accommodation; day: number } | null>(null);
    const [today] = useState(() => toTourDateKey(new Date()));

    const { data: reservation, isPending, error } = useQuery<ReservationDetail>({
        queryKey: ['myPage', 'reservation', id],
        enabled: !!id,
        retry: false,
        queryFn: () => api.reservations.get(id),
    });

    const history = useMemo(() => [...(reservation?.history || [])].reverse(), [reservation]);
    const backToList = () => navigate('/mypage/reservations');

    if (isPending) {
        return <div style={{ padding: 120, textAlign: 'center', color: MW.mute, fontSize: 14 }}>読み込み中…</div>;
    }
    if (error || !reservation) {
        return (
            <section style={{ maxWidth: 1200, margin: '0 auto', padding: '96px 24px 120px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>予約が見つかりません</h1>
                <p style={{ margin: 0, fontSize: 14, color: MW.mute }}>URLをご確認いただくか、ご予約一覧からお選びください。</p>
                <button type="button" onClick={backToList} style={{ ...mintBtn, marginTop: 10, height: 44, padding: '0 22px', fontSize: 14 }} {...mintHover}>ご予約一覧に戻る</button>
            </section>
        );
    }

    const number = reservation.reservationNumber || reservation.id.slice(0, 8).toUpperCase();
    const status = STATUS_MAP[reservation.status] || { label: reservation.status };
    const tone = reservationTone(reservation.status);
    const totalPeople = reservation.totalPeople ?? reservation.travelers ?? 0;
    const start = toTourDateKey(reservation.startDate);
    const end = toTourDateKey(reservation.endDate);
    const duration = computeDays(start, end);
    const dday = start && reservation.status !== 'cancelled' ? daysUntil(start, today) : -1;

    const pb = readBreakdown(reservation);
    const depositPaid = reservation.depositStatus === 'paid' || ['paid', 'confirmed', 'completed'].includes(reservation.status);
    const balancePaid = reservation.balanceStatus === 'paid' || reservation.status === 'completed';
    const paidAmount = (depositPaid && pb ? pb.deposit : 0) + (balancePaid && pb ? pb.local : 0);
    const paidPercent = pb && pb.total > 0 ? Math.round((paidAmount / pb.total) * 100) : 0;

    // Document links always use the reservation UUID; stored URLs only flag that a document was issued.
    const itineraryUrl = reservation.itineraryUrl || reservation.itineraryTemplateId ? `/documents/itinerary/${reservation.id}` : '';
    const contractUrl = reservation.contractUrl ? `/documents/contract/${reservation.id}` : '';

    const guide = reservation.assignedGuide;
    const guideLangs = parseArr(guide?.languages);
    const guideTags = [...guideLangs, ...parseArr(guide?.specialties).slice(0, 2)];
    const stays = reservation.dailyAccommodations || [];
    const visibleHistory = showAllHistory ? history : history.slice(0, 3);

    const R = 30;
    const C = 2 * Math.PI * R;
    const dash = (paidPercent / 100) * C;

    return (
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 104px', display: 'flex', flexDirection: 'column', gap: 28 }}>
            <nav aria-label="パンくずリスト" style={{ display: 'flex', gap: 8, fontSize: 13, color: MW.mute, flexWrap: 'wrap' }}>
                <Crumb to="/" label="ホーム" />
                <span>›</span>
                <Crumb to="/mypage" label="マイページ" />
                <span>›</span>
                <Crumb to="/mypage/reservations" label="ご予約" />
                <span>›</span>
                <span style={{ color: MW.navy, fontWeight: 700 }}>{number}</span>
            </nav>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <button
                        type="button"
                        onClick={backToList}
                        aria-label="戻る"
                        style={{ width: 44, height: 44, borderRadius: '50%', border: `1px solid ${MW.line}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MW.navy, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit' }}
                        {...hover({ borderColor: MW.mint, color: MW.mintDeep }, { borderColor: MW.line, color: MW.navy })}
                    >
                        ‹
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <h1 style={{ margin: 0, fontSize: 'clamp(26px,3vw,34px)', fontWeight: 900 }}>ご予約詳細</h1>
                        <span style={{ fontFamily: MW_FONT_EN, fontSize: 12, fontWeight: 600, color: MW.mute }}>#{number}</span>
                    </div>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 16px', borderRadius: 999, background: tone === TONE.solid ? MW.mintTint : tone.bg, fontSize: 14, fontWeight: 700, color: tone === TONE.solid ? MW.mintDeep : tone.fg }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: tone === TONE.solid || tone === TONE.tint ? MW.mint : tone.fg }} />
                    {status.label}
                </span>
            </div>

            <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 620px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 28 }}>
                    {/* Tour hero */}
                    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 32, background: `linear-gradient(135deg,${MW.navySoft} 0%,${MW.mintDeep} 100%)`, color: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 22 }}>
                        <span style={{ position: 'absolute', right: -80, top: -80, width: 280, height: 280, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.14)', pointerEvents: 'none' }} />
                        <span style={{ position: 'absolute', right: -30, top: -30, width: 180, height: 180, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.14)', pointerEvents: 'none' }} />
                        <span style={{ position: 'relative', fontFamily: MW_FONT_EN, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: MW.mintLight }}>MILKYWAY TOUR</span>
                        <h2 style={{ position: 'relative', margin: 0, fontSize: 'clamp(24px,3vw,32px)', fontWeight: 900, lineHeight: 1.3 }}>{reservation.productName}</h2>
                        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', fontSize: 15, fontWeight: 700 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Ico d={ICON.calendar} color="#FFFFFF" />
                                {start ? `${formatDateShort(start)} 〜 ${formatDateShort(end)}` : '日程未定'}
                            </span>
                            {totalPeople > 0 && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Ico d={ICON.mates} color="#FFFFFF" />
                                    {totalPeople}名
                                </span>
                            )}
                        </div>
                        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 16, paddingTop: 20, borderTop: '1px dashed rgba(255,255,255,0.35)' }}>
                            <HeroStat label="期間" value={duration ? `${duration.days}日${duration.nights}泊` : '—'} />
                            {dday >= 0 && <HeroStat label="出発まで" value={dday === 0 ? 'D-DAY' : `D-${dday}`} en />}
                            <HeroStat label="予約番号" value={number} en />
                        </div>
                    </div>

                    {/* Payment */}
                    {pb && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <h3 style={h3}>お支払い状況</h3>
                            <div style={{ border: `1px solid ${MW.line}`, borderRadius: 20, overflow: 'hidden', background: '#fff' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 22, padding: 24, borderBottom: `1px solid ${HAIR}`, flexWrap: 'wrap' }}>
                                    <div style={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
                                        <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
                                            <circle cx="38" cy="38" r={R} fill="none" stroke={HAIR} strokeWidth="7" />
                                            {dash > 0 && (
                                                <circle cx="38" cy="38" r={R} fill="none" stroke={MW.mint} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${dash} ${C}`} transform="rotate(-90 38 38)" />
                                            )}
                                        </svg>
                                        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MW_FONT_EN, fontSize: 14, fontWeight: 600, color: MW.mintDeep }}>{paidPercent}%</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ fontSize: 13, color: MW.mute }}>お支払い済み</span>
                                        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                            <span style={{ fontFamily: MW_FONT_EN, fontSize: 28, fontWeight: 600 }}>{yen(paidAmount)}</span>
                                            <span style={{ fontSize: 13, color: MW.mute2 }}>/ {yen(pb.total)}</span>
                                        </span>
                                        <span style={{ fontSize: 13, color: MW.mute }}>残り <strong style={{ color: MW.navy }}>{yen(Math.max(0, pb.total - paidAmount))}</strong></span>
                                    </div>
                                </div>
                                <div style={{ padding: '8px 24px 24px', display: 'flex', flexDirection: 'column' }}>
                                    <PayRow label="予約金" sub="PayPalで事前にお支払い" amount={pb.deposit} paid={depositPaid} line />
                                    <PayRow label="現地支払い" sub="ウランバートル到着時 現金 / カード" amount={pb.local} paid={balancePaid} />
                                    {depositPaid ? (
                                        <div style={{ height: 52, borderRadius: 14, background: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: MW.mute }}>
                                            {balancePaid ? 'お支払い完了' : '現地支払いは現地でお支払い'}
                                        </div>
                                    ) : (
                                        <>
                                            <a
                                                href={pb.deposit > 0 ? `https://paypal.me/MilkywayMongolia/${pb.deposit}` : '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ ...mintBtn, height: 52, borderRadius: 14, justifyContent: 'center', fontSize: 15 }}
                                                {...mintHover}
                                            >
                                                PayPalで予約金を支払う
                                            </a>
                                            <span style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: MW.mute }}>
                                                <Ico d={ICON.lock} size={13} color={MW.mute} />
                                                PayPal SSL で安全にお支払い
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stays */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                            <h3 style={h3}>宿泊先</h3>
                            <span style={{ fontSize: 13, color: MW.mute }}>{stays.length > 0 ? `${stays.length}泊` : '日程確定後、1日ごとに確定します'}</span>
                        </div>
                        {stays.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,280px),1fr))', gap: 12 }}>
                                {stays.map((s) => {
                                    const acc = s.accommodation;
                                    const img = parseImage(acc?.images);
                                    return (
                                        <button
                                            key={s.day}
                                            type="button"
                                            onClick={() => acc && setAccModal({ accommodation: acc, day: s.day })}
                                            style={{ ...tile, padding: 14, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}
                                            {...tileHover}
                                        >
                                            <span style={{ width: 84, height: 84, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: MW.chip, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {isUsableImage(img) ? <img src={img} alt={acc?.name || ''} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Ico d={ICON.bed} size={28} color={MW.mute2} />}
                                            </span>
                                            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#FFFFFF', background: MW.mintDeep, padding: '3px 8px', borderRadius: 6 }}>{s.day}日目</span>
                                                    {acc?.type && <span style={{ fontSize: 11, fontWeight: 700, color: MW.mute, background: MW.chip, padding: '3px 8px', borderRadius: 6 }}>{acc.type}</span>}
                                                </span>
                                                <span style={{ fontSize: 15, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc?.name || '—'}</span>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: MW.mintDeep }}>詳しく見る →</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <Pending d={ICON.bed} title="宿泊先を手配中です" sub="日程確定後、1日ごとに確定します" />
                        )}
                    </div>
                </div>

                <aside style={{ flex: '0 1 360px', minWidth: 280, display: 'flex', flexDirection: 'column', gap: 28, position: 'sticky', top: MW_STICKY_TOP + 24 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <h3 style={h3}>ご旅行書類</h3>
                            <span style={{ fontSize: 13, color: MW.mute }}>契約書と日程表をご確認いただけます</span>
                        </div>
                        <DocTile d={ICON.map} title="確定日程表" ready="行程と宿泊先をチェック" pending="準備中（担当者が作成すると表示されます）" href={itineraryUrl} />
                        <DocTile d={ICON.quotes} title="海外旅行契約書" ready="契約内容と注意事項を確認" pending="準備中（発行されるとメールでもお知らせします）" href={contractUrl} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <h3 style={h3}>担当ガイド</h3>
                            {!guide?.name && <span style={{ fontSize: 13, color: MW.mute }}>出発2週間前までに確定します</span>}
                        </div>
                        {guide?.name ? (
                            <button type="button" onClick={() => setGuideOpen(true)} style={{ ...tile, padding: 18, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }} {...tileHover}>
                                <span style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#27AB8F 0%,#3FC2A4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: MW_FONT_EN, fontSize: 20, fontWeight: 600, color: MW.navy }}>
                                    {isUsableImage(guide.image) ? <img src={guide.image} alt={guide.name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : guide.name.charAt(0)}
                                </span>
                                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontSize: 16, fontWeight: 900 }}>{guide.name}</span>
                                    {guideTags.length > 0 && (
                                        <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {guideTags.map((t, i) => (
                                                <span key={i} style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: i < guideLangs.length ? MW.mintTint : MW.chip, color: i < guideLangs.length ? MW.mintDeep : MW.mute }}>{t}</span>
                                            ))}
                                        </span>
                                    )}
                                    <span style={{ fontSize: 12, fontWeight: 700, color: MW.mintDeep }}>詳細を見る →</span>
                                </span>
                                <span style={{ color: MW.mute, fontSize: 18 }}>›</span>
                            </button>
                        ) : (
                            <Pending d={ICON.user} title="担当ガイドを調整中です" sub="決まり次第メールとアプリでお知らせします" />
                        )}
                    </div>

                    {history.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <h3 style={h3}>タイムライン</h3>
                            <div style={{ border: `1px solid ${MW.line}`, borderRadius: 18, background: '#fff', padding: history.length > 3 ? '8px 18px 0' : '8px 18px', display: 'flex', flexDirection: 'column' }}>
                                {visibleHistory.map((h, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 0', borderTop: `1px solid ${i ? HAIR : 'transparent'}` }}>
                                        <Ico d={HISTORY_ICON[h.type] || ICON.bookings} style={{ flexShrink: 0, marginTop: 1 }} />
                                        <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            <span style={{ fontSize: 14, lineHeight: 1.5 }}>{h.description}</span>
                                            <span style={{ fontSize: 12, color: MW.mute2 }}>{formatDateTime(h.timestamp)}</span>
                                        </span>
                                    </div>
                                ))}
                                {history.length > 3 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAllHistory((v) => !v)}
                                        style={{ height: 48, border: 0, borderTop: `1px solid ${HAIR}`, background: 'transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: MW.mute, cursor: 'pointer' }}
                                        {...hover({ color: MW.mintDeep }, { color: MW.mute })}
                                    >
                                        {showAllHistory ? '閉じる' : `すべて見る (${history.length}件)`}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div style={{ borderRadius: 18, padding: 20, background: `linear-gradient(135deg,${MW.mintBg} 0%,#FFFFFF 80%)`, border: `1px solid ${MW.mintTint}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 15, fontWeight: 900 }}>ご不明な点がありましたら</span>
                            <span style={{ fontSize: 12, color: MW.mute }}>日本語担当スタッフが24時間対応</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <ContactBtn d={ICON.chat} label="チャット相談" onClick={() => window.openChannelTalk?.()} />
                            <ContactBtn d={ICON.mail} label="メールで問い合わせ" href="mailto:info@mongolryokou.com" />
                        </div>
                    </div>
                </aside>
            </div>

            <GuideDetailModal guide={guide || null} open={guideOpen} onClose={() => setGuideOpen(false)} />
            <AccommodationDetailModal accommodation={accModal?.accommodation || null} day={accModal?.day} open={!!accModal} onClose={() => setAccModal(null)} />
        </section>
    );
}

function Crumb({ to, label }: { to: string; label: string }) {
    const navigate = useNavigate();
    return (
        <a href={to} onClick={(e) => { e.preventDefault(); navigate(to); }} style={{ color: MW.mute, textDecoration: 'none' }}>
            {label}
        </a>
    );
}

function HeroStat({ label, value, en }: { label: string; value: string; en?: boolean }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: MW.mintTint }}>{label}</span>
            <span style={en ? { fontFamily: MW_FONT_EN, fontSize: 16, fontWeight: 600 } : { fontSize: 16, fontWeight: 900 }}>{value}</span>
        </div>
    );
}

function PayRow({ label, sub, amount, paid, line }: { label: string; sub: string; amount: number; paid: boolean; line?: boolean }) {
    const tone = paid ? TONE.tint : TONE.red;
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '16px 0', borderBottom: line ? `1px solid ${HAIR}` : undefined }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 700 }}>
                    {label}
                    <span style={{ fontSize: 11, fontWeight: 700, color: tone.fg, background: tone.bg, padding: '3px 10px', borderRadius: 999 }}>{paid ? '入金済' : '未入金'}</span>
                </span>
                <span style={{ fontSize: 13, color: MW.mute }}>{sub}</span>
            </div>
            <span style={{ fontFamily: MW_FONT_EN, fontSize: 16, fontWeight: 600 }}>{yen(amount)}</span>
        </div>
    );
}

function DocTile({ d, title, ready, pending, href }: { d: string; title: string; ready: string; pending: string; href: string }) {
    const inner = (
        <>
            <span style={{ width: 44, height: 44, borderRadius: 12, background: MW.mintBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ico d={d} color={href ? MW.mintDeep : MW.mute2} />
            </span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700, color: href ? MW.navy : MW.mute }}>
                    {title}
                    {!href && <span style={{ fontSize: 10, fontWeight: 700, color: TONE.warn.fg, background: TONE.warn.bg, padding: '2px 6px', borderRadius: 4 }}>準備中</span>}
                </span>
                <span style={{ fontSize: 12, color: MW.mute, lineHeight: 1.5 }}>{href ? ready : pending}</span>
            </span>
            {href && <span style={{ color: MW.mute, fontSize: 18 }}>›</span>}
        </>
    );
    if (!href) {
        return <div style={{ ...tile, background: PAPER, borderStyle: 'dashed' }}>{inner}</div>;
    }
    return <a href={href} style={tile} {...tileHover}>{inner}</a>;
}

function Pending({ d, title, sub }: { d: string; title: string; sub: string }) {
    return (
        <div style={{ padding: '26px 20px', border: `1.5px dashed ${MW.line2}`, borderRadius: 18, background: PAPER, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
            <span style={{ width: 48, height: 48, borderRadius: 14, background: '#fff', border: `1px solid ${MW.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                <Ico d={d} size={24} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
            <span style={{ fontSize: 12, color: MW.mute, lineHeight: 1.5 }}>{sub}</span>
        </div>
    );
}

function ContactBtn({ d, label, onClick, href }: { d: string; label: string; onClick?: () => void; href?: string }) {
    const style: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, border: `1px solid ${MW.line}`, borderRadius: 12, background: '#fff', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: MW.navy, cursor: 'pointer', textDecoration: 'none' };
    const content: ReactNode = <><Ico d={d} size={16} />{label}</>;
    return href ? (
        <a href={href} style={style} {...tileHover}>{content}</a>
    ) : (
        <button type="button" onClick={onClick} style={style} {...tileHover}>{content}</button>
    );
}
