import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { GuideDetailModal, AccommodationDetailModal } from '../common/DetailModals';
import { toTourDateKey } from '../../utils/formatDate';
import {
    STATUS_MAP, computeDays, formatDateShort, formatDateTime, parseArr, parseImage, paymentSummary,
    type Accommodation, type ReservationDetail,
} from '../../utils/reservationDetail';
import { MW, MW_FONT_EN, isUsableImage, yen } from '../desktop-primitives/mwTokens';
import { ICON, TONE } from '../mypage-desktop/myPageTheme';
import { daysUntil } from '../mypage-desktop/useMyPageData';
import { MobileShell } from '../mobile/MobileShell';
import { D, M_GRADIENT, M_HAIR, M_PAPER } from '../mobile/mobileTheme';
import { Ico, MLoading, SubPageBar } from '../mobile/mobileUi';
import { DETAIL_ICON, HISTORY_ICON, softTone } from './tripFormat';

/** Timeline rows shown before "すべて見る". */
const HISTORY_PREVIEW = 2;

const tile: CSSProperties = { borderRadius: 20, background: '#FFFFFF', border: `1px solid ${MW.line}`, display: 'flex', alignItems: 'center', gap: 14, color: MW.navy, textDecoration: 'none', fontFamily: 'inherit', textAlign: 'left', width: '100%', boxSizing: 'border-box' };

/**
 * ご予約詳細 (Claude Design: "M Booking Detail"): ticket card, payment status, documents,
 * guide, stays and timeline. Same query and rules as the PC BookingDetailDesktop.
 */
export function BookingDetailMobile() {
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
    const backToList = () => {
        navigate('/mypage/reservations');
        window.scrollTo(0, 0);
    };

    if (isPending) {
        return (
            <MobileShell>
                <SubPageBar title="ご予約詳細" onBack={backToList} />
                <MLoading pad={120} />
            </MobileShell>
        );
    }
    if (error || !reservation) {
        return (
            <MobileShell>
                <SubPageBar title="ご予約詳細" onBack={backToList} />
                <section style={{ padding: '72px 20px 96px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>予約が見つかりません</h2>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: MW.mute }}>URLをご確認いただくか、ご予約一覧からお選びください。</p>
                    <button type="button" onClick={backToList} style={{ marginTop: 10, height: 46, padding: '0 22px', border: 0, borderRadius: 999, background: MW.mint, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: MW.navy, cursor: 'pointer' }}>
                        ご予約一覧に戻る
                    </button>
                </section>
            </MobileShell>
        );
    }

    const number = reservation.reservationNumber || reservation.id.slice(0, 8).toUpperCase();
    const status = STATUS_MAP[reservation.status] || { label: reservation.status };
    const tone = softTone(reservation.status);
    const totalPeople = reservation.totalPeople ?? reservation.travelers ?? 0;
    const start = toTourDateKey(reservation.startDate);
    const end = toTourDateKey(reservation.endDate);
    const duration = computeDays(start, end);
    const dday = start && reservation.status !== 'cancelled' ? daysUntil(start, today) : -1;

    const { pb, depositPaid, balancePaid, paid, percent } = paymentSummary(reservation);

    // Document links always use the reservation UUID; stored URLs only flag that a document was issued.
    const itineraryUrl = reservation.itineraryUrl || reservation.itineraryTemplateId ? `/documents/itinerary/${reservation.id}` : '';
    const contractUrl = reservation.contractUrl ? `/documents/contract/${reservation.id}` : '';

    const guide = reservation.assignedGuide;
    const guideTags = [...parseArr(guide?.languages), ...parseArr(guide?.specialties).slice(0, 2)];
    const stays = reservation.dailyAccommodations || [];
    const visibleHistory = showAllHistory ? history : history.slice(0, HISTORY_PREVIEW);

    return (
        <MobileShell>
            <SubPageBar
                title="ご予約詳細"
                sub={<span style={{ fontFamily: MW_FONT_EN, fontSize: 10, color: MW.mute2 }}>#{number}</span>}
                onBack={backToList}
                right={(
                    <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 999, background: tone.bg, boxShadow: tone === TONE.plain ? `inset 0 0 0 1px ${tone.bd}` : undefined, fontSize: 12, fontWeight: 700, color: tone.fg, whiteSpace: 'nowrap' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: tone.fg }} />
                        {status.label}
                    </span>
                )}
            />

            <section style={{ background: M_PAPER, padding: '16px 16px 36px', display: 'flex', flexDirection: 'column', gap: 26 }}>
                {/* Ticket */}
                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, background: `linear-gradient(160deg,${MW.mintDeep} 0%,${MW.navySoft} 100%)`, color: '#FFFFFF', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <span style={{ position: 'absolute', right: -60, top: -60, width: 180, height: 180, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.12)', boxShadow: '0 0 0 22px rgba(255,255,255,0.04),0 0 0 44px rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
                    <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, fontFamily: MW_FONT_EN, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: MW.mintTint }}>
                        <svg width="20" height="12" viewBox="0 0 20 12" aria-hidden="true"><path d={DETAIL_ICON.mountain} fill={MW.mintTint} /></svg>
                        MILKYWAY TOUR
                    </span>
                    {/* Two lines instead of the design's single line so real tour names are not cut off. */}
                    <span style={{ position: 'relative', fontSize: 22, fontWeight: 900, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{reservation.productName}</span>
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 13, whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                            <Ico d={D.calendar} size={18} color="#FFFFFF" style={{ flexShrink: 0 }} />
                            {start ? `${formatDateShort(start)} 〜 ${formatDateShort(end)}` : '日程未定'}
                        </span>
                        {totalPeople > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, fontWeight: 700 }}>
                                <Ico d={D.people} size={18} color="#FFFFFF" />
                                {totalPeople}名
                            </span>
                        )}
                    </div>
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 10, paddingTop: 14, borderTop: '1px dashed rgba(255,255,255,0.35)' }}>
                        <TicketStat label="期間" value={duration ? `${duration.days}日${duration.nights}泊` : '—'} />
                        {dday >= 0 && <TicketStat label="出発まで" value={dday === 0 ? 'D-DAY' : `D-${dday}`} en align="center" />}
                        <TicketStat label="予約番号" value={number} en align="flex-end" />
                    </div>
                </div>

                {/* Payment */}
                {pb && (
                    <Block d={DETAIL_ICON.wallet} title="お支払い状況">
                        <div style={{ borderRadius: 20, background: '#FFFFFF', border: `1px solid ${MW.line}`, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 18 }}>
                                <span style={{ position: 'relative', flexShrink: 0, width: 68, height: 68, borderRadius: '50%', background: `conic-gradient(${MW.mint} 0 ${percent}%,${M_HAIR} ${percent}% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ width: 54, height: 54, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MW_FONT_EN, fontSize: 13, fontWeight: 600, color: MW.mintDeep }}>{percent}%</span>
                                </span>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ fontSize: 12, color: MW.mute }}>お支払い済み</span>
                                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap' }}>
                                        <strong style={{ fontSize: 24, fontWeight: 900 }}>{yen(paid)}</strong>
                                        <span style={{ fontSize: 12, color: MW.mute2 }}>/ {yen(pb.total)}</span>
                                    </span>
                                    <span style={{ fontSize: 12, color: MW.mute }}>残り <strong style={{ color: MW.navy }}>{yen(Math.max(0, pb.total - paid))}</strong></span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 18px 18px', borderTop: `1px solid ${M_HAIR}` }}>
                                <PayRow label="予約金" sub="PayPalで事前にお支払い" amount={pb.deposit} paid={depositPaid} />
                                <PayRow label="現地支払い" sub="ウランバートル到着時 現金 / カード" amount={pb.local} paid={balancePaid} />
                                {depositPaid ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 14, background: MW.chip, fontSize: 13, fontWeight: 700, color: MW.mute2, whiteSpace: 'nowrap' }}>
                                        {balancePaid ? 'お支払い完了' : '現地支払いは現地でお支払い'}
                                    </span>
                                ) : (
                                    <>
                                        <a
                                            href={pb.deposit > 0 ? `https://paypal.me/MilkywayMongolia/${pb.deposit}` : '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 14, background: M_GRADIENT, fontSize: 14, fontWeight: 700, color: MW.navy, whiteSpace: 'nowrap', textDecoration: 'none' }}
                                        >
                                            PayPalで予約金を支払う
                                        </a>
                                        <span style={{ marginTop: -4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, color: MW.mute }}>
                                            <Ico d={DETAIL_ICON.lock} size={13} color={MW.mute} />
                                            PayPal SSL で安全にお支払い
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </Block>
                )}

                {/* Documents */}
                <Block d={DETAIL_ICON.folder} title="ご旅行書類" sub="契約書と日程表をご確認いただけます">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <DocTile d={DETAIL_ICON.map} title="確定日程表" ready="行程と宿泊先をチェック" pending="準備中（担当者が作成すると表示されます）" href={itineraryUrl} />
                        <DocTile d={D.doc} title="海外旅行契約書" ready="契約内容と注意事項を確認" pending="準備中（発行されるとメールでもお知らせします）" href={contractUrl} />
                    </div>
                </Block>

                {/* Guide */}
                <Block d={DETAIL_ICON.guide} title="担当ガイド" sub={guide?.name ? undefined : '出発2週間前までに確定します'}>
                    {guide?.name ? (
                        <button type="button" onClick={() => setGuideOpen(true)} style={{ ...tile, padding: 16, cursor: 'pointer' }}>
                            <span style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', background: `linear-gradient(135deg,${MW.mintDeep} 0%,#3FC2A4 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MW_FONT_EN, fontSize: 17, fontWeight: 600, color: '#FFFFFF', flexShrink: 0 }}>
                                {isUsableImage(guide.image) ? <img src={guide.image} alt={guide.name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : guide.name.charAt(0)}
                            </span>
                            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 16, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{guide.name}</span>
                                <span style={{ fontSize: 11, color: MW.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[...guideTags, '詳細を見る'].join(' ・ ')}</span>
                            </span>
                            <Ico d={D.chevron} size={16} color={MW.mute2} style={{ flexShrink: 0 }} />
                        </button>
                    ) : (
                        <Pending d={DETAIL_ICON.user} title="担当ガイドを調整中です" sub="決まり次第メールとアプリでお知らせします" />
                    )}
                </Block>

                {/* Stays */}
                <Block d={DETAIL_ICON.bed} title="宿泊先" sub={stays.length > 0 ? `${stays.length}泊` : '日程確定後、1日ごとに確定します'}>
                    {stays.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {stays.map((s) => {
                                const acc = s.accommodation;
                                const img = parseImage(acc?.images);
                                return (
                                    <button key={s.day} type="button" onClick={() => acc && setAccModal({ accommodation: acc, day: s.day })} style={{ ...tile, padding: 12, cursor: 'pointer' }}>
                                        <span style={{ position: 'relative', width: 80, height: 80, borderRadius: 14, overflow: 'hidden', background: MW.chip, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {isUsableImage(img)
                                                ? <img src={img} alt={acc?.name || ''} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                                : <Ico d={DETAIL_ICON.bed} size={28} color={MW.mute2} />}
                                        </span>
                                        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <span style={{ display: 'flex', gap: 6, whiteSpace: 'nowrap', minWidth: 0 }}>
                                                <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#FFFFFF', background: MW.mintDeep, padding: '2px 8px', borderRadius: 6 }}>{s.day}日目</span>
                                                {acc?.type && <span style={{ fontSize: 11, fontWeight: 700, color: MW.mintDeep, background: MW.mintBg, border: `1px solid ${MW.mintTint}`, padding: '1px 8px', borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis' }}>{acc.type}</span>}
                                            </span>
                                            <span style={{ fontSize: 15, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{acc?.name || '—'}</span>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: MW.mintDeep }}>詳しく見る →</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <Pending d={DETAIL_ICON.bed} title="宿泊先を手配中です" sub="日程確定後、1日ごとに確定します" />
                    )}
                </Block>

                {/* Timeline */}
                {history.length > 0 && (
                    <Block d={DETAIL_ICON.history} title="タイムライン">
                        <div style={{ borderRadius: 20, background: '#FFFFFF', border: `1px solid ${MW.line}`, padding: '6px 18px 4px', display: 'flex', flexDirection: 'column' }}>
                            {visibleHistory.map((h, i) => (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '22px minmax(0,1fr)', gap: 12, padding: '14px 0', borderTop: `1px solid ${i ? M_HAIR : 'transparent'}` }}>
                                    <Ico d={HISTORY_ICON[h.type] || ICON.bookings} color={MW.mintDeep} style={{ marginTop: 2 }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: MW.ink2, overflowWrap: 'anywhere' }}>{h.description}</p>
                                        <span style={{ fontFamily: MW_FONT_EN, fontSize: 10, color: MW.mute2 }}>{formatDateTime(h.timestamp)}</span>
                                    </div>
                                </div>
                            ))}
                            {history.length > HISTORY_PREVIEW && (
                                <button type="button" onClick={() => setShowAllHistory((v) => !v)} style={{ height: 46, border: 0, borderTop: `1px solid ${M_HAIR}`, background: 'transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: MW.mute, cursor: 'pointer' }}>
                                    {showAllHistory ? '閉じる' : `すべて見る (${history.length}件)`}
                                </button>
                            )}
                        </div>
                    </Block>
                )}

                {/* Help */}
                <div style={{ borderRadius: 22, background: MW.mintBg, border: `1px solid ${MW.mintTint}`, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ width: 40, height: 40, borderRadius: 12, background: MW.mintDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Ico d={DETAIL_ICON.headset} color="#FFFFFF" />
                        </span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                            <span style={{ fontSize: 14, fontWeight: 900, whiteSpace: 'nowrap' }}>ご不明な点がありましたら</span>
                            <span style={{ fontSize: 11, color: MW.mute, whiteSpace: 'nowrap' }}>日本語担当スタッフが24時間対応</span>
                        </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                        <button type="button" onClick={() => window.openChannelTalk?.()} style={contactBtn}>
                            <Ico d={DETAIL_ICON.chat} size={18} />
                            チャット相談
                        </button>
                        <a href="mailto:info@mongolryokou.com" style={contactBtn}>
                            <Ico d={D.mail} size={18} />
                            メール相談
                        </a>
                    </div>
                </div>
            </section>

            <GuideDetailModal guide={guide || null} open={guideOpen} onClose={() => setGuideOpen(false)} />
            <AccommodationDetailModal accommodation={accModal?.accommodation || null} day={accModal?.day} open={!!accModal} onClose={() => setAccModal(null)} />
        </MobileShell>
    );
}

const contactBtn: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, border: `1px solid ${MW.line}`, borderRadius: 999, background: '#FFFFFF', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: MW.navy, cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none', boxSizing: 'border-box' };

/** Section with the design's icon heading and optional sub copy. */
function Block({ d, title, sub, children }: { d: string; title: string; sub?: string; children: ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 4px' }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 900 }}>
                    <Ico d={d} color={MW.mintDeep} />
                    {title}
                </h2>
                {sub && <span style={{ fontSize: 12, color: MW.mute, paddingLeft: 28 }}>{sub}</span>}
            </div>
            {children}
        </div>
    );
}

function TicketStat({ label, value, en, align = 'flex-start' }: { label: string; value: string; en?: boolean; align?: 'flex-start' | 'center' | 'flex-end' }) {
    return (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: align, minWidth: 0 }}>
            <span style={{ fontSize: 11, color: MW.mintTint }}>{label}</span>
            <span style={en ? { fontFamily: MW_FONT_EN, fontSize: 14, fontWeight: 600 } : { fontSize: 14, fontWeight: 900 }}>{value}</span>
        </span>
    );
}

function PayRow({ label, sub, amount, paid }: { label: string; sub: string; amount: number; paid: boolean }) {
    const fg = paid ? MW.mintDeep : MW.red;
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {label}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: fg, background: paid ? MW.mintTint : '#FDECEA', padding: '2px 8px', borderRadius: 999 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: fg }} />
                        {paid ? '入金済' : '未入金'}
                    </span>
                </span>
                <span style={{ fontSize: 11, color: MW.mute, whiteSpace: 'nowrap' }}>{sub}</span>
            </span>
            <span style={{ flexShrink: 0, fontSize: 15, fontWeight: 900 }}>{yen(amount)}</span>
        </div>
    );
}

/** Document link; a dashed "準備中" tile until the document has been issued. */
function DocTile({ d, title, ready, pending, href }: { d: string; title: string; ready: string; pending: string; href: string }) {
    const inner = (
        <>
            <span style={{ width: 44, height: 44, borderRadius: 14, background: href ? MW.mintBg : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ico d={d} size={22} color={href ? MW.mintDeep : MW.mute2} />
            </span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', color: href ? MW.navy : MW.mute }}>
                    {title}
                    {!href && <span style={{ fontSize: 10, fontWeight: 700, color: TONE.warn.fg, background: TONE.warn.bg, padding: '2px 6px', borderRadius: 4 }}>準備中</span>}
                </span>
                <span style={{ fontSize: 11, color: MW.mute, ...(href ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } : { lineHeight: 1.5 }) }}>{href ? ready : pending}</span>
            </span>
            {href && <Ico d={D.chevron} size={16} color={MW.mute2} style={{ flexShrink: 0 }} />}
        </>
    );
    if (!href) return <div style={{ ...tile, padding: '14px 16px', background: 'transparent', borderStyle: 'dashed', borderColor: MW.line2 }}>{inner}</div>;
    return <a href={href} style={{ ...tile, padding: '14px 16px' }}>{inner}</a>;
}

/** Placeholder while the guide / stays are still being arranged. */
function Pending({ d, title, sub }: { d: string; title: string; sub: string }) {
    return (
        <div style={{ padding: '26px 20px', border: `1.5px dashed ${MW.line2}`, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
            <span style={{ width: 48, height: 48, borderRadius: 14, background: '#fff', border: `1px solid ${MW.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                <Ico d={d} size={24} color={MW.mintDeep} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
            <span style={{ fontSize: 12, color: MW.mute, lineHeight: 1.5 }}>{sub}</span>
        </div>
    );
}
